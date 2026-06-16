import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import dns from 'dns';
import http from 'http';
import https from 'https';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

// ── SSRF Protection: Block private/internal IP ranges ──
const BLOCKED_HOSTS = [
    /^localhost$/i,
    /^127\.\d+\.\d+\.\d+$/,
    /^10\.\d+\.\d+\.\d+$/,
    /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
    /^192\.168\.\d+\.\d+$/,
    /^169\.254\.\d+\.\d+$/,
    /^0\.0\.0\.0$/,
    /^\[?::1\]?$/,
    /^\[?fe80:/i,
    /^\[?fd[0-9a-f]{2}:/i,
    /^metadata\.google\.internal$/i,
];

function isBlockedHost(hostname: string): boolean {
    return BLOCKED_HOSTS.some(re => re.test(hostname));
}

const safeLookup = (hostname: string, options: dns.LookupOptions, callback: (err: NodeJS.ErrnoException | null, address: string, family: number) => void) => {
    dns.lookup(hostname, options, (err, address, family) => {
        if (err) return callback(err, address as any, family);
        const ip = typeof address === 'string' ? address : address[0].address;
        if (isBlockedHost(ip)) {
            return callback(new Error(`Blocked IP address: ${ip}`), ip, family);
        }
        callback(null, ip, family);
    });
};

const secureHttpAgent = new http.Agent({ lookup: safeLookup as any });
const secureHttpsAgent = new https.Agent({ lookup: safeLookup as any });

export async function GET(req: NextRequest) {
    // ── Auth check: require valid session ─────────────
    const sessionCookie = req.cookies.get("ttc_session")?.value;
    if (!sessionCookie || !adminAuth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        await adminAuth.verifySessionCookie(sessionCookie, true);
    } catch {
        return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    try {
        const targetUrl = new URL(url.startsWith('http') ? url : `https://${url}`);

        // ── SSRF check: block private/internal URLs ──
        if (targetUrl.protocol !== 'http:' && targetUrl.protocol !== 'https:') {
            return NextResponse.json({ error: 'Only HTTP/HTTPS URLs are allowed' }, { status: 400 });
        }
        if (isBlockedHost(targetUrl.hostname)) {
            return NextResponse.json({ error: 'This URL is not allowed' }, { status: 400 });
        }

        const domain = targetUrl.hostname.replace('www.', '');

        // 1. Check cache first
        if (adminDb) {
            const cacheRef = adminDb.collection('linkPreviewsCache').doc(encodeURIComponent(targetUrl.href));
            const cachedDoc = await cacheRef.get();
            if (cachedDoc.exists) {
                const data = cachedDoc.data();
                // Cache valid for 7 days
                if (data && data.cachedAt && (Date.now() - data.cachedAt.toMillis() < 7 * 24 * 60 * 60 * 1000)) {
                    const titleLower = (data.preview?.title || "").toLowerCase();
                    const hasLoginWording = titleLower.includes("log in") || titleLower.includes("log into") || titleLower.includes("login") || titleLower.includes("sign up");
                    const isSocialLink = domain.includes("facebook.com") || domain.includes("fb.watch") || domain.includes("fb.com") || domain.includes("instagram.com");
                    
                    if (!(isSocialLink && hasLoginWording)) {
                        return NextResponse.json(data.preview);
                    }
                }
            }
        }

        let preview = {
            title: '',
            description: '',
            thumbnail: '',
            domain,
            url: targetUrl.href
        };

        // 2. Platform-specific fast paths
        if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
            const ytRe = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
            const match = targetUrl.href.match(ytRe);
            if (match && match[1]) {
                const videoId = match[1];
                preview.title = 'YouTube Video'; 
                preview.thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
            }
        } else if (domain.includes('drive.google.com')) {
            preview.title = 'Google Drive File';
            preview.description = 'Shared file from Google Drive';
        } else if (domain.includes('facebook.com') || domain.includes('fb.watch') || domain.includes('fb.com')) {
            preview.title = 'Facebook Post';
            preview.description = 'Click to view this content on Facebook.';
            preview.thumbnail = 'https://upload.wikimedia.org/wikipedia/commons/b/b8/2021_Facebook_icon.svg';
            
            if (targetUrl.href.includes('/groups/')) {
                const groupMatch = targetUrl.pathname.match(/\/groups\/([^/]+)/);
                const groupName = groupMatch 
                    ? decodeURIComponent(groupMatch[1]).replace(/[-_]/g, ' ') 
                    : '';
                preview.title = groupName 
                    ? `Facebook Group: ${groupName.charAt(0).toUpperCase() + groupName.slice(1)}` 
                    : 'Facebook Group Post';
                preview.description = 'Join or view this discussion on Facebook Groups.';
            } else if (targetUrl.href.includes('/watch') || targetUrl.href.includes('/videos/') || domain.includes('fb.watch')) {
                preview.title = 'Facebook Video';
                preview.description = 'Watch this video on Facebook.';
            } else if (targetUrl.href.includes('/events/')) {
                preview.title = 'Facebook Event';
                preview.description = 'View this event details on Facebook.';
            } else {
                const pathParts = targetUrl.pathname.split('/').filter(Boolean);
                if (pathParts.length > 0 && !['posts', 'groups', 'share', 'permalink.php', 'watch', 'events'].includes(pathParts[0])) {
                    const pageName = decodeURIComponent(pathParts[0]).replace(/[-_]/g, ' ');
                    preview.title = `Facebook Post - ${pageName.charAt(0).toUpperCase() + pageName.slice(1)}`;
                }
            }
        } else if (domain.includes('instagram.com') || domain.includes('instagr.am')) {
            preview.title = 'Instagram Post';
            preview.description = 'View this photo or video on Instagram.';
            preview.thumbnail = 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png';
        }

        // 3. If no fast thumbnail, try scraping HTML
        if (!preview.thumbnail || preview.title === 'YouTube Video') {
            try {
                const response = await axios.get(targetUrl.href, {
                    headers: {
                        'User-Agent': 'TTC-Network-Bot/1.0 (+https://ttcnetwork.web.app/bot)',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
                    },
                    timeout: 8000,
                    maxRedirects: 3,
                    httpAgent: secureHttpAgent,
                    httpsAgent: secureHttpsAgent,
                });

                const html = response.data;
                const $ = cheerio.load(html);

                preview.title = $('meta[property="og:title"]').attr('content') || $('title').text() || preview.title;
                preview.description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || preview.description;
                
                const metaImage = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content');
                if (metaImage && !preview.thumbnail) {
                    // Ensure absolute URL
                    if (metaImage.startsWith('http')) {
                        preview.thumbnail = metaImage;
                    } else if (metaImage.startsWith('//')) {
                        preview.thumbnail = `https:${metaImage}`;
                    } else {
                        preview.thumbnail = `${targetUrl.protocol}//${targetUrl.host}${metaImage.startsWith('/') ? '' : '/'}${metaImage}`;
                    }
                }
                
                const ogUrl = $('meta[property="og:url"]').attr('content');
                if (ogUrl) {
                    try {
                        preview.domain = new URL(ogUrl).hostname.replace('www.', '');
                    } catch(e) {}
                }
            } catch (fetchError) {
                console.error(`Failed to scrape ${targetUrl.href}:`, fetchError);
                // Continue with whatever we have
            }
        }

        // Format validation
        if (!preview.title) preview.title = domain;
        if (preview.description && preview.description.length > 200) {
            preview.description = preview.description.substring(0, 197) + '...';
        }

        // 4. Save to cache
        if (adminDb) {
            const cacheRef = adminDb.collection('linkPreviewsCache').doc(encodeURIComponent(targetUrl.href));
            await cacheRef.set({
                preview,
                cachedAt: new Date()
            });
        }

        return NextResponse.json(preview);
    } catch (e: any) {
        console.error('[LinkPreview] Error:', e?.message);
        // Don't leak server error details to the client
        return NextResponse.json({ error: 'Invalid URL or scraping failed' }, { status: 400 });
    }
}

