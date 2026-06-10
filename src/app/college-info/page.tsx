"use client";

import { useState, useEffect, Suspense, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    MapPin,
    Users,
    GraduationCap,
    Building,
    Home,
    Trophy,
    Facebook,
    Globe,
    Phone,
    Mail,
    Clock,
    ChevronRight,
    ChevronDown,
    User,
    Star,
    BookOpen,
    ImageIcon,
    Camera,
    Plus,
    Pencil,
    Save,
    X,
    Loader2,
    Settings,
    Trash2,
    School,
    Search,
    Award,
    Quote,
    ShieldCheck
} from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { canEditCollege, canDeleteGalleryPhoto } from "@/lib/permissions";
import {
    subscribeColleges, updateCollege, requestCollegeEdit, uploadFile,
    subscribeClubs,
    type FirestoreCollege, type FirestoreClub
} from "@/lib/firestore";
import { getClubsAction, addGalleryPhotoAction, deleteGalleryPhotoAction } from "@/lib/actions";
import ClubCard from "./components/ClubCard";
import ClubDetailsModal from "./components/ClubDetailsModal";
import ClubManager from "./components/ClubManager";
import { deleteFromCloudinary } from "@/lib/storage";
import { useConfirm } from "@/contexts/ConfirmContext";

/* ─── Types ─── */
interface FacultyEntry {
    name: string;
    designation: string;
    department: string;
    email: string;
    phone: string;
    photo?: string;
    bio?: string;
    yearsOfService?: string;
}

interface ClubMember {
    name: string;
    role: string;
    batch: string;
}

interface Club {
    name: string;
    icon: string;
    members: number;
    membersList: { name: string; role: string; batch: string }[];
    advisor: string;
}

interface GalleryItem {
    url: string;
    caption: string;
    uploadedBy: string;
    date: string;
}

interface CollegeProfile {
    id: string;
    name: string;
    shortName: string;
    division: string;
    logo: string;
    hasLogo: boolean;
    location: string;
    founded: number;
    principal: {
        name: string;
        contact: string;
        designation?: string;
        photo?: string;
        bio?: string;
        yearsOfService?: string;
        email?: string;
    };
    teachers: number;
    students: number;
    classrooms: number;
    hostel: boolean;
    achievements: string[];
    faculty: FacultyEntry[];
    clubs: Club[];
    gallery?: GalleryItem[];
    social: { facebook?: string; website?: string; email?: string };
    lastUpdatedBy: string;
    lastUpdatedDate: string;
    color: string;
    description: string;
    coverUrl?: string;
}

/* ─── College Profiles Data (all 14) ─── */
const collegesData: CollegeProfile[] = [
    {
        id: "dhaka",
        name: "Govt. Teachers' Training College, Dhaka",
        shortName: "TTC Dhaka",
        division: "Dhaka",
        logo: "/logos/dhaka.png",
        hasLogo: true,
        location: "Dhaka, Bangladesh",
        founded: 1909,
        principal: {
            name: "Prof. Dr. Mohammad Ali",
            contact: "+880-2-9661373",
        },
        teachers: 45,
        students: 850,
        classrooms: 30,
        hostel: true,
        description:
            "The oldest and most prestigious TTC in Bangladesh, established on January 6, 1909. Initially located in Armanitola, it moved to its current site in 1956. Known for pioneering teacher education in the country.",
        achievements: [
            "Best TTC Award 2024",
            "National Debate Champions",
            "100% pass rate in B.Ed 2025",
        ],
        faculty: [
            { name: "Prof. Dr. Mohammad Ali", designation: "Principal", department: "Administration", email: "principal@ttcdhaka.edu.bd", phone: "+880-2-9661373" },
            { name: "Prof. Rehana Akhter", designation: "Vice Principal", department: "Education", email: "rehana@ttcdhaka.edu.bd", phone: "+880-2-9661374" },
            { name: "Dr. Kamal Hossain", designation: "Associate Professor", department: "Science Education", email: "kamal@ttcdhaka.edu.bd", phone: "+880-2-9661375" },
            { name: "Prof. Nasreen Sultana", designation: "Assistant Professor", department: "Social Science Education", email: "nasreen@ttcdhaka.edu.bd", phone: "+880-2-9661376" },
        ],
        clubs: [],
        social: { facebook: "https://facebook.com/ttcdhaka", website: "https://ttcdhaka.edu.bd" },
        gallery: [
            { url: "", caption: "Main campus building — front view", uploadedBy: "Admin", date: "Feb 2026" },
            { url: "", caption: "Science Laboratory", uploadedBy: "Dr. Kamal", date: "Jan 2026" },
            { url: "", caption: "College auditorium during B.Ed seminar", uploadedBy: "Tanvir Rahman", date: "Mar 2026" },
            { url: "", caption: "Library reading room", uploadedBy: "Admin", date: "Feb 2026" },
            { url: "", caption: "Sports ground — annual meet", uploadedBy: "Sakib", date: "Mar 2026" },
            { url: "", caption: "Classroom during lecture", uploadedBy: "Prof. Rehana", date: "Jan 2026" },
        ],
        lastUpdatedBy: "Admin",
        lastUpdatedDate: "March 1, 2026",
        color: "#1a5276",
    },
    {
        id: "feni",
        name: "Govt. Teachers' Training College, Feni",
        shortName: "TTC Feni",
        division: "Chittagong",
        logo: "/logos/feni.png",
        hasLogo: true,
        location: "Feni, Chittagong Division",
        founded: 1962,
        principal: {
            name: "Prof. Nazma Begum",
            contact: "+880-331-62220",
        },
        teachers: 28,
        students: 420,
        classrooms: 18,
        hostel: true,
        description:
            "Established as a Junior Training College in 1962, upgraded to a full TTC in 1976. Offers B.Ed (Honors), B.Ed (Professional), and M.Ed under National University. Known for cultural excellence.",
        achievements: ["Regional Sports Champions 2025", "Best Cultural Program Award"],
        faculty: [
            { name: "Prof. Nazma Begum", designation: "Principal", department: "Administration", email: "principal@ttcfeni.edu.bd", phone: "+880-331-62220" },
            { name: "Dr. Rafiqul Islam", designation: "Associate Professor", department: "Education", email: "rafiqul@ttcfeni.edu.bd", phone: "+880-331-62221" },
            { name: "Masuma Khatun", designation: "Assistant Professor", department: "Bangla Education", email: "masuma@ttcfeni.edu.bd", phone: "+880-331-62222" },
        ],
        clubs: [],
        social: { facebook: "https://facebook.com/ttcfeni" },
        lastUpdatedBy: "Sakib (Student)",
        lastUpdatedDate: "Feb 28, 2026",
        color: "#0D6E3F",
    },
    {
        id: "rajshahi",
        name: "Govt. Teachers' Training College, Rajshahi",
        shortName: "TTC Rajshahi",
        division: "Rajshahi",
        logo: "/logos/rajshahi.png",
        hasLogo: true,
        location: "Rajshahi, Bangladesh",
        founded: 1955,
        principal: {
            name: "Prof. Abdul Karim",
            contact: "+880-721-775023",
        },
        teachers: 38,
        students: 650,
        classrooms: 24,
        hostel: true,
        description:
            "Established in 1955, one of the leading TTCs in northern Bangladesh. Campus includes administrative buildings, female dormitory, four male dormitories, auditorium, mosque, and sports facilities.",
        achievements: ["National Quiz Champions 2024", "Innovation in Education Award"],
        faculty: [
            { name: "Prof. Abdul Karim", designation: "Principal", department: "Administration", email: "principal@ttcrajshahi.edu.bd", phone: "+880-721-775023" },
            { name: "Dr. Shirin Akhter", designation: "Associate Professor", department: "Mathematics Education", email: "shirin@ttcrajshahi.edu.bd", phone: "+880-721-775024" },
        ],
        clubs: [],
        social: { facebook: "https://facebook.com/ttcrajshahi" },
        lastUpdatedBy: "College Manager",
        lastUpdatedDate: "Feb 26, 2026",
        color: "#1B1464",
    },
    {
        id: "cumilla",
        name: "Govt. Teachers' Training College, Cumilla",
        shortName: "TTC Cumilla",
        division: "Chittagong",
        logo: "/logos/cumilla.png",
        hasLogo: true,
        location: "Cumilla, Bangladesh",
        founded: 1962,
        principal: {
            name: "Prof. Monira Akhter",
            contact: "+880-81-72335",
        },
        teachers: 32,
        students: 500,
        classrooms: 20,
        hostel: true,
        description:
            "Established in 1962, a well-respected institution in eastern Bangladesh. Known for community engagement and producing skilled educators for the region.",
        achievements: ["Community Engagement Award 2025"],
        faculty: [
            { name: "Prof. Monira Akhter", designation: "Principal", department: "Administration", email: "principal@ttccumilla.edu.bd", phone: "+880-81-72335" },
            { name: "Dr. Rezwan Ahmed", designation: "Associate Professor", department: "English Education", email: "rezwan@ttccumilla.edu.bd", phone: "+880-81-72336" },
        ],
        clubs: [],
        social: { facebook: "https://facebook.com/ttccumilla" },
        lastUpdatedBy: "Student",
        lastUpdatedDate: "Feb 18, 2026",
        color: "#0D3B8F",
    },
    {
        id: "sylhet",
        name: "Govt. Teachers' Training College, Sylhet",
        shortName: "TTC Sylhet",
        division: "Sylhet",
        logo: "/logos/sylhet.png",
        hasLogo: true,
        location: "Sylhet, Bangladesh",
        founded: 1946,
        principal: {
            name: "Prof. Shamsul Haque",
            contact: "+880-821-716523",
        },
        teachers: 35,
        students: 580,
        classrooms: 22,
        hostel: true,
        description:
            "One of the oldest TTCs, established in 1946. Offers in-service and pre-service professional training, B.Ed (Hons.), B.Ed, and M.Ed under National University.",
        achievements: ["Heritage Education Award 2024", "Best Library Award 2023"],
        faculty: [
            { name: "Prof. Shamsul Haque", designation: "Principal", department: "Administration", email: "principal@ttcsylhet.edu.bd", phone: "+880-821-716523" },
            { name: "Dr. Aminul Haque", designation: "Associate Professor", department: "English Education", email: "aminul@ttcsylhet.edu.bd", phone: "+880-821-716524" },
        ],
        clubs: [],
        social: { facebook: "https://facebook.com/ttcsylhet" },
        lastUpdatedBy: "Teacher",
        lastUpdatedDate: "Feb 20, 2026",
        color: "#0e6655",
    },
    {
        id: "chattagram",
        name: "Govt. Teachers' Training College, Chattagram",
        shortName: "TTC Chattagram",
        division: "Chittagong",
        logo: "/logos/chattagram.png",
        hasLogo: true,
        location: "Chattagram, Bangladesh",
        founded: 1958,
        principal: {
            name: "Prof. Rafiqul Islam",
            contact: "+880-31-626789",
        },
        teachers: 40,
        students: 700,
        classrooms: 25,
        hostel: true,
        description:
            "Started as Chittagong Normal School in 1958, upgraded to Junior Training College and then full TTC in 1977. Double-shift system since 1994. Offers B.Ed and M.Ed under National University.",
        achievements: ["Environmental Education Award 2024", "Science Fair Gold 2025"],
        faculty: [
            { name: "Prof. Rafiqul Islam", designation: "Principal", department: "Administration", email: "principal@ttcchattagram.edu.bd", phone: "+880-31-626789" },
            { name: "Dr. Fatema Begum", designation: "Associate Professor", department: "Science Education", email: "fatema@ttcchattagram.edu.bd", phone: "+880-31-626790" },
        ],
        clubs: [],
        social: { facebook: "https://facebook.com/ttcchattagram" },
        lastUpdatedBy: "College Manager",
        lastUpdatedDate: "Feb 25, 2026",
        color: "#1a5276",
    },
    {
        id: "rangpur",
        name: "Govt. Teachers' Training College, Rangpur",
        shortName: "TTC Rangpur",
        division: "Rangpur",
        logo: "",
        hasLogo: false,
        location: "Rangpur, Bangladesh",
        founded: 1882,
        principal: {
            name: "Prof. Amjad Hossain",
            contact: "+880-521-63452",
        },
        teachers: 34,
        students: 520,
        classrooms: 22,
        hostel: true,
        description:
            "One of the oldest teacher training institutions in Bangladesh, established in 1882. Leveraging its rich history to train the next generation of global-standard educators.",
        achievements: ["Environmental Education Award 2024", "Pedagogical Excellence 2023"],
        faculty: [
            { name: "Prof. Amjad Hossain", designation: "Principal", department: "Administration", email: "principal@rangpur.gov.bd", phone: "+880-521-63452" },
        ],
        clubs: [],
        social: { facebook: "https://facebook.com/ttcrangpur" },
        lastUpdatedBy: "Admin",
        lastUpdatedDate: "March 10, 2026",
        color: "#2D7D2D",
    },
    {
        id: "khulna",
        name: "Govt. Teachers' Training College, Khulna",
        shortName: "TTC Khulna",
        division: "Khulna",
        logo: "",
        hasLogo: false,
        location: "Khulna, Bangladesh",
        founded: 1970,
        principal: {
            name: "Prof. Dr. Ashadul Huq",
            contact: "+880-41-762234",
        },
        teachers: 32,
        students: 480,
        classrooms: 21,
        hostel: true,
        description:
            "A prominent TTC in southwestern Bangladesh. Nurturing pedagogical excellence through innovative teaching methods and student-centric leadership.",
        achievements: ["Southwest Region Tech Innovator 2024"],
        faculty: [],
        clubs: [],
        social: { facebook: "https://facebook.com/ttckhulna" },
        lastUpdatedBy: "Admin",
        lastUpdatedDate: "March 10, 2026",
        color: "#1a5276",
    },
    {
        id: "mymensingh",
        name: "Govt. Women's Teachers' Training College, Mymensingh",
        shortName: "Women's TTC Mymensingh",
        division: "Mymensingh",
        logo: "",
        hasLogo: false,
        location: "Mymensingh, Bangladesh",
        founded: 1952,
        principal: {
            name: "Prof. Arifa Akhter",
            contact: "+880-91-66432",
        },
        teachers: 28,
        students: 540,
        classrooms: 18,
        hostel: true,
        description:
            "Established in 1952, one of the few women-focused teacher training institutions in Bangladesh. Dedicated to empowering female educators across the country.",
        achievements: ["Women Empowerment in Education Award 2024"],
        faculty: [],
        clubs: [],
        social: { facebook: "https://facebook.com/ttcmymensingh" },
        lastUpdatedBy: "Admin",
        lastUpdatedDate: "March 10, 2026",
        color: "#8B5CF6",
    },
    {
        id: "mymensingh_coed",
        name: "Govt. Teachers' Training College, Mymensingh",
        shortName: "TTC Mymensingh",
        division: "Mymensingh",
        logo: "",
        hasLogo: false,
        location: "Mymensingh, Bangladesh",
        founded: 1948,
        principal: {
            name: "To be updated",
            contact: "",
        },
        teachers: 0,
        students: 0,
        classrooms: 0,
        hostel: false,
        description: "Established in 1948.",
        achievements: [],
        faculty: [],
        clubs: [],
        social: { facebook: "" },
        lastUpdatedBy: "Admin",
        lastUpdatedDate: "March 10, 2026",
        color: "#1a5276",
    },
    {
        id: "bogura",
        name: "Govt. B.Ed College, Bogura",
        shortName: "Govt. B.Ed College, Bogura",
        division: "Rajshahi",
        logo: "https://res.cloudinary.com/dqmqvynxo/image/upload/v1775406576/ttc-connect/logos/aoij4zt9ikuemwmvfkqd.jpg",
        hasLogo: true,
        location: "Bogura, Bangladesh",
        founded: 2000,
        principal: {
            name: "To be updated",
            contact: "",
        },
        teachers: 0,
        students: 0,
        classrooms: 0,
        hostel: false,
        description:
            "Established in 2000.",
        achievements: [],
        faculty: [],
        clubs: [],
        social: { facebook: "", website: "" },
        lastUpdatedBy: "SAKIB",
        lastUpdatedDate: "March 19, 2026",
        color: "#1A5276",
    },
    {
        id: "jashore",
        name: "Govt. Teachers' Training College, Jashore",
        shortName: "TTC Jashore",
        division: "Khulna",
        logo: "",
        hasLogo: false,
        location: "Jashore, Bangladesh",
        founded: 1963,
        principal: {
            name: "Prof. Md. Azizur Rahman",
            contact: "+880-421-68554",
        },
        teachers: 30,
        students: 450,
        classrooms: 20,
        hostel: true,
        description:
            "Operating since July 1963 in Khulna Division. Fostering professional development and ethical teaching practices in the heart of Jashore.",
        achievements: ["Regional Professional Excellence 2025"],
        faculty: [],
        clubs: [],
        social: { facebook: "https://facebook.com/ttcjashore" },
        lastUpdatedBy: "Admin",
        lastUpdatedDate: "March 10, 2026",
        color: "#D97706",
    },
    {
        id: "barishal",
        name: "Shaheed Abdur Rab Serniabat TTC, Barishal",
        shortName: "TTC Barishal",
        division: "Barishal",
        logo: "",
        hasLogo: false,
        location: "Barishal, Bangladesh",
        founded: 1999,
        principal: {
            name: "Prof. Dr. Mohammad Abdul Latif",
            contact: "+880-431-217345",
        },
        teachers: 26,
        students: 380,
        classrooms: 16,
        hostel: true,
        description:
            "Founded in 1999. Championing quality education and regional growth through Shaheed Abdur Rab Serniabat TTC's distinguished legacy.",
        achievements: ["Riverine Education Excellence 2024"],
        faculty: [],
        clubs: [],
        social: { facebook: "https://facebook.com/ttcbarishal" },
        lastUpdatedBy: "Admin",
        lastUpdatedDate: "March 10, 2026",
        color: "#0ea5e9",
    },
    {
        id: "faridpur",
        name: "Govt. Teachers' Training College, Faridpur",
        shortName: "TTC Faridpur",
        division: "Dhaka",
        logo: "",
        hasLogo: false,
        location: "Faridpur, Bangladesh",
        founded: 2005,
        principal: {
            name: "Prof. Shahjahan Ali",
            contact: "+880-631-62287",
        },
        teachers: 22,
        students: 340,
        classrooms: 14,
        hostel: false,
        description:
            "Established in 2005. Committed to modernizing teacher training and community engagement in the Dhaka division.",
        achievements: ["Community Engagement Excellence 2025"],
        faculty: [],
        clubs: [],
        social: { facebook: "https://facebook.com/ttcfaridpur" },
        lastUpdatedBy: "Admin",
        lastUpdatedDate: "March 10, 2026",
        color: "#DC2626",
    },
    {
        id: "pabna",
        name: "Govt. B.Ed College, Pabna",
        shortName: "B.Ed Pabna",
        division: "Rajshahi",
        logo: "",
        hasLogo: false,
        location: "Pabna, Bangladesh",
        founded: 1998,
        principal: {
            name: "Prof. Mst. Nasreen Sultana",
            contact: "+880-731-66543",
        },
        teachers: 24,
        students: 360,
        classrooms: 15,
        hostel: false,
        description:
            "Established in 1998. Inspiring future educators in Pabna with a focus on holistic development and academic integrity.",
        achievements: ["Academic Integrity Award 2024"],
        faculty: [],
        clubs: [],
        social: { facebook: "https://facebook.com/bedpabna" },
        lastUpdatedBy: "Admin",
        lastUpdatedDate: "March 10, 2026",
        color: "#7C3AED",
    },

];

/* ─── UI Components ─── */
function ContactButton({ href, icon: Icon }: { href: string; icon: any }) {
    return (
        <a
            href={href}
            className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-[#0C0C10] flex items-center justify-center text-gray-400 hover:text-primary hover:bg-primary/5 transition-all border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md active:scale-90"
        >
            <Icon size={16} />
        </a>
    );
}

const LandingButton = ContactButton; // Alias for consistency



/* ─── Inner page (needs Suspense for useSearchParams) ─── */
function CollegeInfoInner() {
    const searchParams = useSearchParams();
    const collegeParam = searchParams.get("college");
    const { profile } = useAuth();
    const { showToast } = useToast();

    const [fsColleges, setFsColleges] = useState<(FirestoreCollege & { id: string })[]>([]);
    const [clubs, setClubs] = useState<(FirestoreClub & { id: string })[]>([]);
    const [clubsLoading, setClubsLoading] = useState(false);
    const [selectedClub, setSelectedClub] = useState<(FirestoreClub & { id: string }) | null>(null);
    const [showClubManager, setShowClubManager] = useState(false);
    const [editingSection, setEditingSection] = useState<string | null>(null);
    const [savingSection, setSavingSection] = useState<string | null>(null);
    const [uploadingSection, setUploadingSection] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<FirestoreCollege>>({});
    // Gallery upload state
    const [showGalleryUpload, setShowGalleryUpload] = useState(false);
    const [galleryUploading, setGalleryUploading] = useState(false);
    const [galleryCaption, setGalleryCaption] = useState("");
    const [galleryFile, setGalleryFile] = useState<File | null>(null);
    const [galleryPreview, setGalleryPreview] = useState<string | null>(null);

    const { confirm, setIsLoading: setConfirmLoading, close: closeConfirm } = useConfirm();

    const [activeTab, setActiveTab] = useState<'overview' | 'faculty' | 'clubs' | 'gallery'>('overview');
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedDivision, setSelectedDivision] = useState("All");
    const contentRef = useRef<HTMLDivElement>(null);


    useEffect(() => {
        const unsub = subscribeColleges((data) => setFsColleges(data));
        return () => unsub();
    }, []);

    const mergedColleges = useMemo(() => {
        return collegesData.map(c => {
            const fs = fsColleges.find(f => f.id === c.id);
            if (!fs) return { ...c, clubs: [] }; // Default empty clubs if no FS data
            return {
                ...c,
                logo: fs.logo || c.logo,
                hasLogo: !!(fs.logo || c.logo),
                coverUrl: fs.coverUrl || "",
                name: fs.name || c.name,
                shortName: (fs.shortName && fs.shortName !== (fs.name || c.name)) ? fs.shortName : c.shortName,
                description: fs.description || c.description,
                principal: {
                    name: fs.principal?.name || c.principal.name,
                    contact: fs.principal?.contact || c.principal.contact,
                    photo: fs.principal?.photo || c.principal.photo || "",
                    bio: fs.principal?.bio || c.principal.bio || "",
                    yearsOfService: fs.principal?.yearsOfService || c.principal.yearsOfService || "",
                    email: fs.principal?.email || c.principal.email || "",
                },
                students: fs.students || c.students,
                teachers: fs.teachers || c.teachers,
                classrooms: fs.classrooms || c.classrooms,
                hostel: fs.hostel ?? c.hostel,
                lastUpdatedBy: fs.lastUpdatedBy || c.lastUpdatedBy,
                lastUpdatedDate: fs.lastUpdatedDate ? new Date((fs.lastUpdatedDate as import("firebase/firestore").Timestamp).seconds * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : c.lastUpdatedDate,
                faculty: (fs.faculty as FacultyEntry[]) || c.faculty,
                clubs: [], // We will subscribe to clubs collection directly now
                gallery: fs.gallery || c.gallery,
                achievements: fs.achievements || c.achievements,
                social: fs.social || c.social,
            };
        });
    }, [fsColleges]);

    // Filtered colleges for both desktop and mobile
    const divisions = ["All", "Dhaka", "Chittagong", "Rajshahi", "Khulna", "Sylhet", "Barishal", "Rangpur", "Mymensingh"];

    const filteredColleges = useMemo(() => {
        return mergedColleges.filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.shortName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.location.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesDivision = selectedDivision === "All" || c.division === selectedDivision;
            return matchesSearch && matchesDivision;
        });
    }, [mergedColleges, searchTerm, selectedDivision]);

    // Full-screen gallery state
    const [selectedGalleryImage, setSelectedGalleryImage] = useState<import("@/lib/firestore").GalleryEntry | null>(null);

    const [selectedCollege, setSelectedCollege] = useState<CollegeProfile>(() => {
        // 1. URL param always takes highest priority (deep links, notifications, etc.)
        if (collegeParam) {
            const found = collegesData.find((c) => c.id === collegeParam);
            if (found) return found;
        }

        // 2. Personalized default: after 3+ visits, show user's own college
        if (typeof window !== "undefined") {
            try {
                const visitCount = parseInt(localStorage.getItem("ttc_college_info_visit_count") || "0", 10);
                if (visitCount >= 3 && profile?.collegeId) {
                    const userCollege = collegesData.find((c) => c.id === profile.collegeId);
                    if (userCollege) return userCollege;
                }
            } catch {
                // localStorage unavailable (SSR/private mode) — fall through to default
            }
        }

        // 3. Fallback: default college (TTC Dhaka)
        return collegesData[0];
    });

    // Track visit count for personalized default behavior
    useEffect(() => {
        try {
            const key = "ttc_college_info_visit_count";
            const current = parseInt(localStorage.getItem(key) || "0", 10);
            localStorage.setItem(key, String(current + 1));
        } catch {
            // localStorage unavailable — silently ignore
        }
    }, []); // Runs once per page visit

    const [isMobileSelectorOpen, setIsMobileSelectorOpen] = useState(false);

    const handleCollegeSelect = (college: CollegeProfile) => {
        setSelectedCollege(college);
        setActiveTab('overview');
        setIsMobileSelectorOpen(false); // Close modal on select
        // On mobile, scroll to content after selection
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 100);
        }
    };

    // Subscribe to clubs with server action fallback
    useEffect(() => {
        if (!selectedCollege.id) return;
        setClubsLoading(true);
        let cancelled = false;

        // Try real-time subscription first
        const unsubClubs = subscribeClubs(selectedCollege.id, (data) => {
            if (!cancelled) {
                setClubs(data.filter((c: any) => c.isActive !== false));
                setClubsLoading(false);
            }
        });

        // Fallback: if no data arrives within 3s, use server action
        const fallbackTimer = setTimeout(async () => {
            if (!cancelled && clubs.length === 0) {
                try {
                    const serverClubs = await getClubsAction(selectedCollege.id);
                    if (!cancelled && serverClubs) {
                        const filtered = (serverClubs as any[]).filter(c => c.isActive !== false);
                        setClubs(filtered as (FirestoreClub & { id: string })[]);
                    }
                } catch {
                    // silently fail
                }
                if (!cancelled) setClubsLoading(false);
            }
        }, 3000);

        return () => { cancelled = true; clearTimeout(fallbackTimer); unsubClubs(); };
    }, [selectedCollege.id, clubs.length]);

    useEffect(() => {
        if (collegeParam) {
            const found = mergedColleges.find((c) => c.id === collegeParam);
            if (found) setSelectedCollege(found);
        } else {
            // keep the same college selected if it exists in merged, otherwise default
            const currentSelected = mergedColleges.find(c => c.id === selectedCollege?.id);
            if (currentSelected) setSelectedCollege(currentSelected);
        }
    }, [collegeParam, mergedColleges, selectedCollege?.id]);

    // Personalized default: when profile loads async (after mount), auto-select user's college
    const hasAppliedPersonalizedDefault = useRef(false);
    useEffect(() => {
        // Skip if: URL param is present, already applied, or profile not loaded yet
        if (collegeParam || hasAppliedPersonalizedDefault.current || !profile?.collegeId) return;
        try {
            const visitCount = parseInt(localStorage.getItem("ttc_college_info_visit_count") || "0", 10);
            if (visitCount >= 3) {
                const userCollege = mergedColleges.find((c) => c.id === profile.collegeId);
                if (userCollege) {
                    setSelectedCollege(userCollege);
                    hasAppliedPersonalizedDefault.current = true;
                }
            }
        } catch {
            // localStorage unavailable
        }
    }, [profile?.collegeId, collegeParam, mergedColleges]);

    // Auto-select club if clubId parameter is present in URL
    const clubParam = searchParams.get("clubId");
    useEffect(() => {
        if (clubParam && clubs.length > 0) {
            const foundClub = clubs.find(c => c.id === clubParam);
            if (foundClub) {
                setActiveTab("clubs");
                setSelectedClub(foundClub);
            }
        }
    }, [clubParam, clubs]);

    // Auth permissions
    const permissions = profile ? canEditCollege(profile, selectedCollege.id) : { allowed: false, needsReview: false };

    const handleEditStart = (section: string, initialData: Partial<FirestoreCollege> & Record<string, unknown>) => {
        setEditingSection(section);
        setEditForm(initialData);
    };

    const handleEditSave = async (section: string) => {
        if (!permissions.allowed) return;
        setSavingSection(section);
        try {
            if (permissions.needsReview) {
                await requestCollegeEdit(selectedCollege.id, { sectionName: section, changes: editForm });
                showToast("Edit submitted for review by admin/manager.", "success");
            } else {
                await updateCollege(selectedCollege.id, editForm);
            }
            setEditingSection(null);
        } catch (error) {
            showToast(error instanceof Error ? error.message : "Failed to save edits", "error");
        } finally {
            setSavingSection(null);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: "logo" | "coverUrl" | "principalPhoto") => {
        if (!permissions.allowed) return;
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingSection(field);
        try {
            // Delete old asset from Cloudinary to keep storage clean
            let oldUrl: string | undefined;
            if (field === "principalPhoto") {
                oldUrl = selectedCollege.principal?.photo;
            } else {
                oldUrl = selectedCollege[field];
            }

            if (oldUrl) {
                await deleteFromCloudinary(oldUrl);
            }

            const storagePath = field === "principalPhoto" ? `colleges/${selectedCollege.id}/principal` : `colleges/${selectedCollege.id}/${field}`;
            const url = await uploadFile(storagePath, file);

            const updateData: Record<string, any> = {};
            if (field === "principalPhoto") {
                updateData["principal.photo"] = url;
            } else {
                updateData[field] = url;
                if (field === "logo") updateData.hasLogo = true;
            }

            if (permissions.needsReview) {
                await requestCollegeEdit(selectedCollege.id, { sectionName: field, changes: updateData });
                showToast("Image update submitted for review.", "success");
            } else {
                await updateCollege(selectedCollege.id, updateData);
            }
        } catch (error) {
            showToast(error instanceof Error ? error.message : "Failed to upload image", "error");
        } finally {
            setUploadingSection(null);
            e.target.value = "";
        }
    };

    return (
        <div className="min-h-screen bg-white dark:bg-black overflow-x-hidden">
            {/* Header */}
            <div className="bg-white dark:bg-[#16181C] border-b border-gray-100 dark:border-white/10">
                <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white font-english">College Information</h1>
                    <p className="text-gray-700 dark:text-gray-400 text-xs sm:text-sm mt-1">Detailed profiles of all {collegesData.length} Government Teachers&apos; Training Colleges</p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="flex flex-col lg:flex-row gap-8 items-start">

                    {/* ─── Desktop Sidebar ─── */}
                    <aside className="hidden lg:flex flex-col w-80 bg-white dark:bg-[#0C0C10] border border-gray-100 dark:border-gray-800/50 rounded-3xl sticky top-24 h-[calc(100vh-120px)] overflow-hidden shadow-sm dark:shadow-black/20">
                        <div className="p-6 pb-4">
                            <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2 mb-6">
                                <School className="text-primary" />
                                Institutions
                            </h2>

                            {/* Desktop Search & Filter */}
                            <div className="space-y-4 mb-6">
                                <div className="relative group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-all duration-300" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search colleges..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-[#161620] border border-gray-100 dark:border-gray-800 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all dark:text-white font-medium placeholder:text-gray-400"
                                    />
                                </div>

                                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar scrollbar-hide">
                                    {divisions.map(div => (
                                        <button
                                            key={div}
                                            onClick={() => setSelectedDivision(div)}
                                            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${selectedDivision === div
                                                    ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                                                    : "bg-gray-50 dark:bg-[#161620] text-gray-500 border-gray-100 dark:border-gray-800 hover:border-primary/40"
                                                }`}
                                        >
                                            {div}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-1 custom-scrollbar no-scrollbar">
                            {filteredColleges.length > 0 ? (
                                filteredColleges.map((college) => (
                                    <button
                                        key={college.id}
                                        onClick={() => handleCollegeSelect(college)}
                                        className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all duration-300 relative group ${selectedCollege.id === college.id
                                                ? "bg-primary/5 border border-primary/20"
                                                : "hover:bg-gray-50 dark:hover:bg-[#161620] border border-transparent"
                                            }`}
                                    >
                                        <div className={`flex-shrink-0 w-12 h-12 rounded-xl border flex items-center justify-center transition-all ${selectedCollege.id === college.id
                                                ? "bg-white dark:bg-[#1E1E2E] border-primary/30 shadow-md scale-105"
                                                : "bg-gray-50 dark:bg-[#161620] border-gray-100 dark:border-gray-800 group-hover:scale-110"
                                            }`}>
                                            {college.hasLogo ? (
                                                <Image src={college.logo} alt={college.shortName} width={32} height={32} className="object-contain" />
                                            ) : (
                                                <School size={20} className={selectedCollege.id === college.id ? "text-primary" : "text-gray-400"} />
                                            )}
                                        </div>
                                        <div className="text-left overflow-hidden">
                                            <h3 className={`text-sm font-black truncate ${selectedCollege.id === college.id ? "text-primary" : "text-gray-900 dark:text-gray-100"}`}>
                                                {college.shortName}
                                            </h3>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{college.location.split(',')[0].trim()}</p>
                                        </div>

                                        {selectedCollege.id === college.id && (
                                            <motion.div
                                                layoutId="active-nav-indicator"
                                                className="absolute right-3 w-1.5 h-1.5 rounded-full bg-primary"
                                            />
                                        )}
                                    </button>
                                ))
                            ) : (
                                <div className="py-12 text-center">
                                    <Search size={32} className="mx-auto text-gray-300 mb-2 opacity-20" />
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-relaxed px-4">No institutions found</p>
                                </div>
                            )}
                        </div>
                    </aside>

                    {/* ─── Main Content ─── */}
                    {/* ─── Main Content ─── */}
                    <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden relative" ref={contentRef}>
                        {/* ─── Mobile Header & College Switcher Trigger ─── */}
                        <div className="lg:hidden sticky top-0 z-[40] bg-white/90 dark:bg-black/90 backdrop-blur-2xl border-b border-gray-100 dark:border-white/10 px-4 py-3 mb-4 -mx-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-[#161620] border border-gray-200 dark:border-gray-800 flex items-center justify-center shadow-sm overflow-hidden">
                                    {selectedCollege.hasLogo ? <Image src={selectedCollege.logo} alt="" width={24} height={24} className="object-contain" /> : <School size={16} className="text-gray-400" />}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-primary/80">Current Institution</span>
                                    <h2 className="text-sm font-black text-gray-900 dark:text-white truncate max-w-[180px]">{selectedCollege.shortName}</h2>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsMobileSelectorOpen(true)}
                                className="px-3 py-2 bg-primary/10 text-primary rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 active:scale-95 transition-transform"
                            >
                                Change <ChevronDown size={14} />
                            </button>
                        </div>

                        {/* ─── Profile Area ─── */}
                        <div className="flex-1 w-full space-y-6">
                            {/* Profile Header Card */}
                            <section className="bg-white dark:bg-[#161620] rounded-2xl sm:rounded-[2.5rem] border border-gray-100 dark:border-white/5 shadow-sm overflow-visible relative">
                                {/* Cover Banner with Premium Glass Overlay */}
                                <div className="h-32 sm:h-64 relative group overflow-hidden rounded-t-2xl sm:rounded-t-[2.5rem]">
                                    <div
                                        className="w-full h-full transition-transform duration-[2000ms] group-hover:scale-110"
                                        style={{
                                            background: selectedCollege.coverUrl ? `url(${selectedCollege.coverUrl}) center/cover no-repeat` : `linear-gradient(135deg, ${selectedCollege.color}, ${selectedCollege.color}BB, ${selectedCollege.color}88)`
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                                    {permissions.allowed && (
                                        <label className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-primary backdrop-blur-xl rounded-full text-white cursor-pointer transition-all border border-white/20 z-30 shadow-2xl">
                                            {uploadingSection === "coverUrl" ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, "coverUrl")} disabled={!!uploadingSection} />
                                        </label>
                                    )}

                                    {/* Desktop Identity Overlay - only at lg+ where sidebar is visible */}
                                    <div className="hidden lg:flex absolute bottom-8 left-8 right-8 items-end gap-8">
                                        <div className="relative shrink-0">
                                            <div className="w-32 h-32 rounded-[2.5rem] bg-white p-3 shadow-2xl border-[6px] border-white dark:border-[#161620] overflow-hidden flex items-center justify-center relative translate-y-4">
                                                {selectedCollege.hasLogo ? <Image src={selectedCollege.logo} alt="" width={90} height={90} className="object-contain" /> : <div className="text-5xl font-black text-gray-200">{selectedCollege.shortName.charAt(0)}</div>}
                                            </div>
                                            {permissions.allowed && (
                                                <label className="absolute bottom-4 -right-2 w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center cursor-pointer shadow-2xl border-4 border-white dark:border-[#161620] hover:scale-110 transition-transform z-30">
                                                    {uploadingSection === "logo" ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, "logo")} disabled={!!uploadingSection} />
                                                </label>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 pb-2">
                                            <h2 className="text-3xl lg:text-4xl font-black font-bengali text-white leading-tight uppercase tracking-normal drop-shadow-2xl !whitespace-normal !break-words">{selectedCollege.name}</h2>
                                            <div className="flex flex-wrap items-center gap-4 mt-3">
                                                <span className="px-4 py-1.5 bg-white/10 backdrop-blur-xl text-white rounded-xl text-[11px] font-black uppercase tracking-widest border border-white/10 flex items-center gap-2 shadow-xl"><MapPin size={12} className="text-primary" /> {selectedCollege.location}</span>
                                                <span className="px-4 py-1.5 bg-white/10 backdrop-blur-xl text-white rounded-xl text-[11px] font-black uppercase tracking-widest border border-white/10 flex items-center gap-2 shadow-xl"><Clock size={12} className="text-primary" /> Established {selectedCollege.founded}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Mobile & Tablet Identity Layout - Premium Overlap */}
                                <div className="lg:hidden px-4 flex flex-col items-center text-center w-full relative -mt-10 mb-4 z-10 pointer-events-none">
                                    {/* College Logo (Overlapping) */}
                                    <div className="relative mb-3 pointer-events-auto">
                                        <div className="w-20 h-20 rounded-2xl bg-white dark:bg-[#161620] p-1.5 shadow-2xl border-4 border-white dark:border-[#161620] overflow-hidden flex items-center justify-center">
                                            {selectedCollege.hasLogo ? <Image src={selectedCollege.logo} alt="" width={64} height={64} className="object-contain" /> : <div className="text-3xl font-black text-gray-400 dark:text-gray-500">{selectedCollege.shortName.charAt(0)}</div>}
                                        </div>
                                        {permissions.allowed && (
                                            <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center cursor-pointer shadow-lg border-2 border-white dark:border-[#161620] active:scale-90 transition-transform z-40">
                                                {uploadingSection === "logo" ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, "logo")} disabled={!!uploadingSection} />
                                            </label>
                                        )}
                                    </div>

                                    {/* College Name */}
                                    <h2 className="text-lg font-black font-bengali text-gray-900 dark:text-white leading-tight tracking-normal break-words w-full px-2 mb-3 drop-shadow-sm pointer-events-auto">
                                        {selectedCollege.name}
                                    </h2>

                                    {/* Location & Founded Badges */}
                                    <div className="flex flex-wrap items-center justify-center gap-2 pointer-events-auto">
                                        <span className="px-3 py-1 bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300 rounded-full text-[10px] font-black uppercase tracking-wider border border-gray-100 dark:border-white/5 flex items-center gap-1.5 shadow-sm"><MapPin size={10} className="text-primary" /> {selectedCollege.location}</span>
                                        <span className="px-3 py-1 bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300 rounded-full text-[10px] font-black uppercase tracking-wider border border-gray-100 dark:border-white/5 flex items-center gap-1.5 shadow-sm"><Clock size={10} className="text-primary" /> Est. {selectedCollege.founded}</span>
                                    </div>
                                </div>

                                {/* Majestic About Institution */}
                                <div className="px-3 sm:px-6 py-4 sm:py-8 sm:p-10 bg-white dark:bg-[#161620] border-t border-gray-100 dark:border-white/5 relative group/about">
                                    <div className="flex items-center justify-between mb-4 relative">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-1.5 bg-primary rounded-full shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]" />
                                            <h3 className="text-[12px] font-black text-gray-900 dark:text-white uppercase tracking-[0.3em]">About Institution</h3>
                                        </div>
                                        {permissions.allowed && editingSection !== "description" && (
                                            <button
                                                onClick={() => handleEditStart("description", { description: selectedCollege.description })}
                                                className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg sm:rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                            >
                                                <Pencil size={13} /> <span className="hidden sm:inline">Edit</span>
                                            </button>
                                        )}
                                    </div>

                                    {editingSection === "description" ? (
                                        <div className="mt-4 space-y-4">
                                            <textarea
                                                value={editForm.description || ""}
                                                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                                className="w-full text-base bg-gray-50 dark:bg-black/40 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 min-h-[150px] text-gray-900 dark:text-gray-100 focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                                                placeholder="Enter majestice description..."
                                            />
                                            <div className="flex gap-3">
                                                <button onClick={() => handleEditSave("description")} className="px-8 py-3 bg-primary text-white font-black rounded-2xl text-[11px] uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-primary/20 transition-all active:scale-95">
                                                    {savingSection === "description" ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Updates
                                                </button>
                                                <button onClick={() => setEditingSection(null)} className="px-8 py-3 bg-gray-100 dark:bg-white/5 text-gray-500 font-black rounded-2xl text-[11px] uppercase tracking-widest">Cancel</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="font-bengali tracking-normal text-[13px] sm:text-lg text-gray-600 dark:text-gray-400 leading-relaxed font-medium italic !whitespace-normal !break-words [overflow-wrap:anywhere]">
                                            &ldquo;{selectedCollege.description}&rdquo;
                                        </p>
                                    )}
                                </div>
                            </section>

                            {/* ─── Premium Sticky Tab Navigation (Desktop Only) ─── */}
                            <div className="hidden lg:block sticky top-0 z-[48] bg-white/95 dark:bg-[#161620]/95 backdrop-blur-2xl border-b border-gray-100 dark:border-white/5 px-10 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.1)]">
                                <div className="flex items-center gap-2 sm:gap-14 max-w-full mx-auto">
                                    {[
                                        { id: 'overview', label: 'Overview', icon: BookOpen },
                                        { id: 'faculty', label: 'Faculty', icon: Users },
                                        { id: 'clubs', label: 'Clubs', icon: Trophy },
                                        { id: 'gallery', label: 'Gallery', icon: ImageIcon },
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id as any)}
                                            className={`group relative flex items-center gap-2 sm:gap-3 py-4 sm:py-7 px-1 transition-all text-[10px] sm:text-[12px] font-black uppercase tracking-[0.1em] sm:tracking-[0.25em] whitespace-nowrap ${activeTab === tab.id
                                                    ? "text-primary"
                                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                                }`}
                                        >
                                            <tab.icon size={14} className={`transition-all duration-500 ${activeTab === tab.id ? "text-primary scale-125" : "opacity-40"}`} />
                                            {tab.label}
                                            {activeTab === tab.id && (
                                                <motion.div
                                                    layoutId="activeTabIndicatorPremium"
                                                    className="absolute bottom-0 left-0 right-0 h-1.5 bg-primary rounded-t-full shadow-[0_-5px_20px_rgba(var(--primary-rgb),0.6)]"
                                                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                                                />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                                    className="space-y-8 w-full"
                                >

                                    {activeTab === 'overview' && (
                                        <div className="space-y-4 sm:space-y-8 w-full max-w-full flex-1 min-w-0">
                                            {/* Key Statistics Grid */}
                                            <div className="relative">
                                                <div className="flex items-center justify-between mb-3 sm:mb-6 relative">
                                                    <h3 className="text-xs sm:text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-2 sm:gap-3">
                                                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-primary/10 flex items-center justify-center"><Star size={12} className="text-primary sm:w-[14px] sm:h-[14px]" /></div>
                                                        Key Statistics
                                                    </h3>
                                                    {permissions.allowed && editingSection !== "stats" && (
                                                        <button
                                                            onClick={() => handleEditStart("stats", { students: selectedCollege.students, teachers: selectedCollege.teachers, classrooms: selectedCollege.classrooms, hostel: selectedCollege.hostel })}
                                                            className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg sm:rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                                        >
                                                            <Pencil size={13} /> <span className="hidden sm:inline">Edit</span>
                                                        </button>
                                                    )}
                                                </div>

                                                {editingSection === "stats" ? (
                                                    <div className="bg-white dark:bg-[#161620] rounded-2xl sm:rounded-3xl p-5 border border-gray-100 dark:border-gray-800 shadow-xl">
                                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                                            <div className="space-y-1">
                                                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block ml-1">Students</label>
                                                                <input type="number" value={editForm.students || 0} onChange={e => setEditForm({ ...editForm, students: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-gray-50 dark:bg-black/50 border border-gray-100 dark:border-gray-800 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none dark:text-white" />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block ml-1">Teachers</label>
                                                                <input type="number" value={editForm.teachers || 0} onChange={e => setEditForm({ ...editForm, teachers: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-gray-50 dark:bg-black/50 border border-gray-100 dark:border-gray-800 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none dark:text-white" />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block ml-1">Classrooms</label>
                                                                <input type="number" value={editForm.classrooms || 0} onChange={e => setEditForm({ ...editForm, classrooms: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-gray-50 dark:bg-black/50 border border-gray-100 dark:border-gray-800 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none dark:text-white" />
                                                            </div>
                                                            <div className="flex flex-col justify-end">
                                                                <label className="flex items-center gap-2 cursor-pointer p-2 bg-gray-50 dark:bg-black/50 border border-gray-100 dark:border-gray-800 rounded-lg">
                                                                    <input type="checkbox" checked={editForm.hostel || false} onChange={e => setEditForm({ ...editForm, hostel: e.target.checked })} className="accent-primary w-4 h-4 rounded" />
                                                                    <span className="text-[10px] text-gray-600 dark:text-gray-400 font-black uppercase tracking-widest">Hostel</span>
                                                                </label>
                                                            </div>
                                                        </div>
                                                        <button onClick={() => handleEditSave("stats")} className="w-full py-2 bg-primary text-white font-black rounded-lg text-[9px] uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-lg shadow-primary/20 transition-all active:scale-95">
                                                            {savingSection === "stats" ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Update Statistics
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-6">
                                                        {[
                                                            { icon: GraduationCap, label: "Students", value: selectedCollege.students, color: "text-blue-500", aura: "bg-blue-500/10" },
                                                            { icon: Users, label: "Teachers", value: selectedCollege.teachers, color: "text-emerald-500", aura: "bg-emerald-500/10" },
                                                            { icon: Building, label: "Classrooms", value: selectedCollege.classrooms, color: "text-purple-500", aura: "bg-purple-500/10" },
                                                            { icon: Home, label: "Hostel", value: selectedCollege.hostel ? "Yes ✓" : "No", color: "text-amber-500", aura: "bg-amber-500/10" },
                                                        ].map((stat, idx) => (
                                                            <motion.div
                                                                key={stat.label}
                                                                initial={{ opacity: 0, y: 10 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                transition={{ delay: idx * 0.1 }}
                                                                className="bg-gray-50 dark:bg-[#1A1A24] rounded-xl sm:rounded-2xl p-3 sm:p-6 border border-gray-200 dark:border-white/5 shadow-sm relative overflow-hidden group"
                                                            >
                                                                <div className={`w-8 h-8 sm:w-10 sm:h-10 ${stat.aura} rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-3 group-hover:scale-110 transition-transform`}>
                                                                    <stat.icon className={`${stat.color} w-3.5 h-3.5 sm:w-5 sm:h-5`} />
                                                                </div>
                                                                <div className="font-english text-lg sm:text-3xl font-black text-gray-900 dark:text-white tracking-tighter">{stat.value}</div>
                                                                <div className="text-[8px] sm:text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5 sm:mt-1">{stat.label}</div>
                                                                <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-primary/10 transition-colors" />
                                                            </motion.div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Leadership Spotlight (Redesigned Unified Card) */}
                                            <section className="relative overflow-visible group/principal bg-white dark:bg-[#161620] rounded-2xl sm:rounded-[3rem] border border-gray-100 dark:border-white/5 shadow-sm">
                                                {/* Background Aura */}
                                                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 transition-colors group-hover/principal:bg-primary/10" />

                                                <div className="p-4 sm:p-10 relative z-10">
                                                    <div className="flex flex-col md:flex-row gap-4 sm:gap-8 lg:gap-12 items-center md:items-start text-center md:text-left">
                                                        {/* Profile Image & Quick Actions */}
                                                        <div className="shrink-0 flex flex-col items-center md:items-start w-full md:w-auto">
                                                            <div className="relative">
                                                                <div className="w-20 h-20 sm:w-44 sm:h-44 rounded-xl sm:rounded-3xl overflow-hidden border-3 sm:border-4 border-gray-100 dark:border-gray-800 shadow-xl relative group/img bg-gray-50 dark:bg-gray-900">
                                                                    {selectedCollege.principal?.photo ? (
                                                                        <Image src={selectedCollege.principal.photo} alt="" fill className="object-cover transition-transform duration-700 group-hover/img:scale-110" />
                                                                    ) : (
                                                                        <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/20 dark:from-primary/5 dark:to-primary/10 flex items-center justify-center text-primary/50"><User size={36} className="sm:w-12 sm:h-12" /></div>
                                                                    )}

                                                                    {permissions.allowed && (
                                                                        <label className="absolute bottom-2 right-2 w-8 h-8 bg-primary text-white rounded-xl flex items-center justify-center cursor-pointer shadow-lg border-2 border-white dark:border-gray-800 hover:scale-110 transition-transform">
                                                                            <Camera size={14} />
                                                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "principalPhoto")} />
                                                                        </label>
                                                                    )}
                                                                </div>
                                                                <div className="absolute -bottom-2 -left-2 w-8 h-8 sm:w-10 sm:h-10 bg-amber-500 text-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg border-3 sm:border-4 border-white dark:border-gray-800 tracking-normal">
                                                                    <Award size={14} className="sm:w-[18px] sm:h-[18px]" />
                                                                </div>
                                                            </div>

                                                            <div className="mt-3 sm:mt-6 flex flex-col items-center md:items-start gap-1.5 sm:gap-2 w-full md:w-auto">
                                                                {selectedCollege.principal?.contact && (
                                                                    <a href={`tel:${selectedCollege.principal.contact}`} className="flex items-center justify-center md:justify-start gap-3 px-4 py-2.5 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/5 group/link text-center md:text-left w-full">
                                                                        <Phone size={12} className="text-gray-400 group-hover/link:text-primary transition-colors shrink-0" />
                                                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-normal">{selectedCollege.principal.contact}</span>
                                                                    </a>
                                                                )}
                                                                <div className="flex items-center justify-center md:justify-start gap-3 px-4 py-2.5 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/5 w-full">
                                                                    <Mail size={12} className="text-gray-400 shrink-0" />
                                                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest truncate">{selectedCollege.principal?.email || `principal@${selectedCollege.id.toLowerCase()}.gov.bd`}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Biography / Content */}
                                                        <div className="flex-1 min-w-0 w-full flex flex-col items-center md:items-start text-gray-900 dark:text-white">
                                                            <div className="flex flex-col md:flex-row md:items-start justify-center md:justify-between mb-6 relative w-full items-center">
                                                                <div className="flex flex-col items-center md:items-start w-full">
                                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-[9px] font-black uppercase tracking-[0.2em] mb-4">
                                                                        <ShieldCheck size={12} /> Institutional Leadership
                                                                    </span>
                                                                    <h4 className="text-xl sm:text-4xl font-black font-bengali text-gray-900 dark:text-white tracking-normal leading-snug mb-2 sm:mb-3 text-center md:text-left break-words w-full px-1 sm:px-0">
                                                                        {selectedCollege.principal?.name || "Institution Head"}
                                                                    </h4>
                                                                    <div className="flex items-center justify-center md:justify-start gap-2 sm:gap-3 flex-wrap px-4 sm:px-0">
                                                                        <p className="text-[10px] sm:text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">{selectedCollege.principal?.designation || "Principal"}</p>
                                                                        <div className="hidden sm:block h-1 w-1 bg-gray-300 dark:bg-gray-600 rounded-full shrink-0" />
                                                                        <p className="text-[10px] sm:text-xs font-bold text-primary uppercase tracking-widest whitespace-nowrap">{selectedCollege.principal?.yearsOfService || "8+ Years"} Experience</p>
                                                                    </div>
                                                                </div>
                                                                {permissions.allowed && editingSection !== "principal" && (
                                                                    <button
                                                                        onClick={() => handleEditStart("principal", { principal: selectedCollege.principal })}
                                                                        className="absolute top-0 right-0 sm:relative mt-2 sm:mt-0 sm:shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg sm:rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
                                                                    >
                                                                        <Pencil size={13} /> <span className="hidden sm:inline">Edit</span>
                                                                    </button>
                                                                )}
                                                            </div>

                                                            {editingSection === "principal" ? (
                                                                <div className="space-y-4">
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                        <input type="text" value={editForm.principal?.name || ""} onChange={e => setEditForm({ ...editForm, principal: { ...editForm.principal, name: e.target.value } as any })} placeholder="Full Name" className="w-full px-4 py-3 bg-gray-50 dark:bg-black/40 border border-gray-100 dark:border-gray-800 rounded-xl text-sm" />
                                                                        <input type="text" value={editForm.principal?.designation || ""} onChange={e => setEditForm({ ...editForm, principal: { ...editForm.principal, designation: e.target.value } as any })} placeholder="Designation" className="w-full px-4 py-3 bg-gray-50 dark:bg-black/40 border border-gray-100 dark:border-gray-800 rounded-xl text-sm" />
                                                                        <input type="text" value={editForm.principal?.yearsOfService || ""} onChange={e => setEditForm({ ...editForm, principal: { ...editForm.principal, yearsOfService: e.target.value } as any })} placeholder="Service Years (e.g. 8+ Years)" className="w-full px-4 py-3 bg-gray-50 dark:bg-black/40 border border-gray-100 dark:border-gray-800 rounded-xl text-sm" />
                                                                        <input type="text" value={editForm.principal?.contact || ""} onChange={e => setEditForm({ ...editForm, principal: { ...editForm.principal, contact: e.target.value } as any })} placeholder="Contact Number" className="w-full px-4 py-3 bg-gray-50 dark:bg-black/40 border border-gray-100 dark:border-gray-800 rounded-xl text-sm" />
                                                                        <input type="email" value={editForm.principal?.email || ""} onChange={e => setEditForm({ ...editForm, principal: { ...editForm.principal, email: e.target.value } as any })} placeholder="Email Address" className="w-full px-4 py-3 bg-gray-50 dark:bg-black/40 border border-gray-100 dark:border-gray-800 rounded-xl text-sm sm:col-span-2" />
                                                                    </div>
                                                                    <textarea value={editForm.principal?.bio || ""} onChange={e => setEditForm({ ...editForm, principal: { ...editForm.principal, bio: e.target.value } as any })} placeholder="Principal's Message..." className="w-full h-32 px-4 py-3 bg-gray-50 dark:bg-black/40 border border-gray-100 dark:border-gray-800 rounded-xl text-sm italic" />
                                                                    <div className="flex gap-3">
                                                                        <button onClick={() => handleEditSave("principal")} className="px-6 py-2.5 bg-primary text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20">Save Profile</button>
                                                                        <button onClick={() => setEditingSection(null)} className="px-6 py-2.5 bg-gray-100 dark:bg-white/5 text-gray-500 font-bold rounded-xl text-[10px] uppercase tracking-widest">Cancel</button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div>
                                                                    <div className="relative mt-2 p-1">
                                                                        <Quote className="absolute -top-4 -left-4 w-10 h-10 text-gray-200 dark:text-gray-800 pointer-events-none" />
                                                                        <p className="text-base sm:text-lg text-gray-800 dark:text-gray-200 leading-relaxed font-semibold italic relative z-10 whitespace-normal break-words w-full px-2">
                                                                            &ldquo;{selectedCollege.principal?.bio || "Committed to nurturing the next generation of educators through innovation and academic excellence."}&rdquo;
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </section>

                                            {/* Achievements Section (Pill Style) */}
                                            {selectedCollege.achievements && selectedCollege.achievements.length > 0 && (
                                                <section className="bg-white dark:bg-[#161620] rounded-2xl sm:rounded-[2.5rem] border border-gray-100 dark:border-white/5 shadow-sm p-4 sm:p-5 md:p-8">
                                                    <div className="flex items-center justify-between mb-5 relative">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                                                <Trophy size={14} className="text-amber-500" />
                                                            </div>
                                                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Achievements</h3>
                                                        </div>
                                                        {permissions.allowed && editingSection !== "achievements" && (
                                                            <button
                                                                onClick={() => handleEditStart("achievements", { achievements: selectedCollege.achievements || [] })}
                                                                className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg sm:rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                                            >
                                                                <Pencil size={13} /> <span className="hidden sm:inline">Edit</span>
                                                            </button>
                                                        )}
                                                    </div>

                                                    {editingSection === "achievements" ? (
                                                        <div className="space-y-3">
                                                            {((editForm.achievements as string[]) || []).map((ach: string, i: number) => (
                                                                <div key={i} className="flex gap-2 items-center">
                                                                    <input type="text" value={ach} onChange={(e) => { const newA = [...((editForm.achievements as string[]) || [])]; newA[i] = e.target.value; setEditForm({ ...editForm, achievements: newA }); }} className="flex-1 px-4 py-3 bg-gray-50 dark:bg-black/40 border border-gray-100 dark:border-gray-800 rounded-xl text-sm" />
                                                                    <button onClick={() => { const newA = [...((editForm.achievements as string[]) || [])]; newA.splice(i, 1); setEditForm({ ...editForm, achievements: newA }); }} className="p-2 text-red-500"><X size={14} /></button>
                                                                </div>
                                                            ))}
                                                            <button onClick={() => setEditForm({ ...editForm, achievements: [...((editForm.achievements as string[]) || []), ""] })} className="w-full py-3 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl text-[10px] font-black text-gray-400 uppercase tracking-widest hover:border-primary hover:text-primary transition-colors">Add Field</button>
                                                            <div className="flex gap-2 pt-2">
                                                                <button onClick={() => handleEditSave("achievements")} className="flex-1 py-3 bg-primary text-white font-black rounded-xl text-[10px] uppercase tracking-widest">Update</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-2 sm:gap-3">
                                                            {selectedCollege.achievements.map((ach, i) => (
                                                                <motion.div
                                                                    key={i}
                                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                                    animate={{ opacity: 1, scale: 1 }}
                                                                    transition={{ delay: i * 0.05 }}
                                                                    className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-full hover:bg-amber-500/5 hover:border-amber-500/20 transition-colors group"
                                                                >
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 group-hover:animate-ping" />
                                                                    <span className="text-[11px] sm:text-xs font-bold text-gray-600 dark:text-gray-300">{ach}</span>
                                                                </motion.div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </section>
                                            )}

                                            {/* Social Bar (Circular Icons Style) */}
                                            <section className="bg-white dark:bg-[#161620] rounded-2xl sm:rounded-[2.5rem] border border-gray-100 dark:border-white/5 shadow-sm p-4 sm:p-5 md:p-8">
                                                <div className="flex items-center justify-between mb-5">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                                            <Globe size={14} className="text-primary" />
                                                        </div>
                                                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Connect Online</h3>
                                                    </div>
                                                    {permissions.allowed && editingSection !== "social" && (
                                                        <button
                                                            onClick={() => handleEditStart("social", { social: (selectedCollege.social || {}) as any })}
                                                            className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg sm:rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                                        >
                                                            <Pencil size={13} /> <span className="hidden sm:inline">Edit</span>
                                                        </button>
                                                    )}
                                                </div>

                                                {editingSection === "social" ? (
                                                    <div className="space-y-4">
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            {['facebook', 'website', 'email'].map(type => (
                                                                <div key={type} className="space-y-1">
                                                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">{type}</label>
                                                                    <input type="text" value={(editForm.social as any)?.[type] || ""} onChange={e => setEditForm({ ...editForm, social: { ...(editForm.social as any), [type]: e.target.value } } as any)} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-black/40 border border-gray-100 dark:border-gray-800 rounded-xl text-sm" />
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <button onClick={() => handleEditSave("social")} className="w-full py-3 bg-primary text-white font-black rounded-xl text-[10px] uppercase tracking-widest">Save Socials</button>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-wrap gap-3 sm:gap-4 items-center justify-center sm:justify-start">
                                                        {[
                                                            { icon: Facebook, value: selectedCollege.social?.facebook, color: "text-blue-600", bg: "bg-blue-600/10", label: "Facebook" },
                                                            { icon: Globe, value: selectedCollege.social?.website, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Website" },
                                                            { icon: Mail, value: selectedCollege.social?.email, color: "text-purple-500", bg: "bg-purple-500/10", label: "Email" },
                                                        ].filter(s => s.value).map((s, i) => (
                                                            <a key={i} href={s.label === "Email" ? `mailto:${s.value}` : s.value} target={s.label === "Email" ? "_self" : "_blank"} rel="noopener noreferrer" className="flex items-center gap-3 group">
                                                                <div className={`w-10 h-10 ${s.bg} rounded-full flex items-center justify-center transition-transform group-hover:scale-110 group-hover:rotate-12`}>
                                                                    <s.icon size={18} className={s.color} />
                                                                </div>
                                                                <div className="hidden sm:block">
                                                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{s.label}</div>
                                                                    <div className="text-xs font-bold text-gray-600 dark:text-gray-300">{s.label === "Website" ? "Official Site" : s.label}</div>
                                                                </div>
                                                            </a>
                                                        ))}
                                                        <div className="h-4 w-px bg-gray-100 dark:bg-white/5 mx-2 hidden sm:block" />
                                                        <a href={`tel:${selectedCollege.principal?.contact}`} className="px-5 py-2.5 sm:px-6 bg-gray-900 dark:bg-white text-white dark:text-black rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:shadow-xl transition-all active:scale-95">
                                                            <Phone size={14} /> Call Office
                                                        </a>
                                                    </div>
                                                )}
                                            </section>
                                        </div>
                                    )}

                                    {activeTab === 'faculty' && (
                                        <div className="bg-white dark:bg-[#161620] rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 border border-gray-100 dark:border-white/10 shadow-sm dark:shadow-black/20 min-h-[300px]">
                                            {/* Faculty Header */}
                                            <div className="flex items-center justify-between mb-4 sm:mb-6 relative">
                                                <h3 className="text-xs sm:text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-2 sm:gap-3">
                                                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-primary/10 flex items-center justify-center"><Users size={12} className="text-primary sm:w-[14px] sm:h-[14px]" /></div>
                                                    Faculty Members
                                                </h3>
                                                {permissions.allowed && editingSection !== "faculty" && (
                                                    <button
                                                        onClick={() => handleEditStart("faculty", { faculty: selectedCollege.faculty || [] })}
                                                        className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg sm:rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                                    >
                                                        <Pencil size={13} /> <span className="hidden sm:inline">Edit</span>
                                                    </button>
                                                )}
                                            </div>

                                            {editingSection === "faculty" ? (
                                                <div className="space-y-4">
                                                    {(editForm.faculty || []).map((teacher: any, i: number) => (
                                                        <div key={i} className="p-4 bg-gray-50 dark:bg-[#0C0C10] rounded-xl border border-gray-200 dark:border-gray-800 space-y-4 relative">
                                                            <button onClick={() => { const newL = [...(editForm.faculty || [])]; newL.splice(i, 1); setEditForm({ ...editForm, faculty: newL }); }} className="absolute top-2 right-2 p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg"><X size={14} /></button>
                                                            <div className="flex flex-col sm:flex-row gap-4">
                                                                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-white dark:bg-[#161620] border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center relative group/tphoto shrink-0 overflow-hidden">
                                                                    {teacher.photo ? <Image src={teacher.photo} alt="Teacher" fill className="object-cover" /> : <User size={20} className="text-gray-300" />}
                                                                    <label className="absolute inset-0 bg-black/50 flex items-center justify-center text-white cursor-pointer opacity-0 group-hover/tphoto:opacity-100 transition-opacity">
                                                                        <Camera size={14} />
                                                                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                                                                            const file = e.target.files?.[0];
                                                                            if (!file) return;
                                                                            const url = await uploadFile(`colleges/${selectedCollege.id}/faculty/${i}`, file);
                                                                            const newL = [...(editForm.faculty || [])];
                                                                            newL[i] = { ...newL[i], photo: url };
                                                                            setEditForm({ ...editForm, faculty: newL });
                                                                        }} />
                                                                    </label>
                                                                </div>
                                                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                    <div><label className="text-[10px] font-bold text-gray-500 uppercase">Name</label><input type="text" value={teacher.name} onChange={(e) => { const newL = [...(editForm.faculty || [])]; newL[i].name = e.target.value; setEditForm({ ...editForm, faculty: newL }); }} className="w-full bg-white dark:bg-[#161620] border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-1.5 text-sm" /></div>
                                                                    <div><label className="text-[10px] font-bold text-gray-500 uppercase">Designation</label><input type="text" value={teacher.designation} onChange={(e) => { const newL = [...(editForm.faculty || [])]; newL[i].designation = e.target.value; setEditForm({ ...editForm, faculty: newL }); }} className="w-full bg-white dark:bg-[#161620] border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-1.5 text-sm" /></div>
                                                                    <div><label className="text-[10px] font-bold text-gray-500 uppercase">Department</label><input type="text" value={teacher.department} onChange={(e) => { const newL = [...(editForm.faculty || [])]; newL[i].department = e.target.value; setEditForm({ ...editForm, faculty: newL }); }} className="w-full bg-white dark:bg-[#161620] border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-1.5 text-sm" /></div>
                                                                    <div><label className="text-[10px] font-bold text-gray-500 uppercase">Service Years</label><input type="text" value={teacher.yearsOfService || ""} onChange={(e) => { const newL = [...(editForm.faculty || [])]; newL[i].yearsOfService = e.target.value; setEditForm({ ...editForm, faculty: newL }); }} className="w-full bg-white dark:bg-[#161620] border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-1.5 text-sm" placeholder="e.g. 8 Yrs" /></div>
                                                                    <div><label className="text-[10px] font-bold text-gray-500 uppercase">Email</label><input type="email" value={teacher.email} onChange={(e) => { const newL = [...(editForm.faculty || [])]; newL[i].email = e.target.value; setEditForm({ ...editForm, faculty: newL }); }} className="w-full bg-white dark:bg-[#161620] border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-1.5 text-sm" /></div>
                                                                    <div><label className="text-[10px] font-bold text-gray-500 uppercase">Phone</label><input type="text" value={teacher.phone} onChange={(e) => { const newL = [...(editForm.faculty || [])]; newL[i].phone = e.target.value; setEditForm({ ...editForm, faculty: newL }); }} className="w-full bg-white dark:bg-[#161620] border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-1.5 text-sm" /></div>
                                                                </div>
                                                            </div>
                                                            <div><label className="text-[10px] font-bold text-gray-500 uppercase">Short Bio</label><textarea value={teacher.bio || ""} onChange={(e) => { const newL = [...(editForm.faculty || [])]; newL[i].bio = e.target.value; setEditForm({ ...editForm, faculty: newL }); }} className="w-full bg-white dark:bg-[#161620] border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-1.5 text-sm min-h-[60px]" /></div>
                                                        </div>
                                                    ))}
                                                    <button onClick={() => setEditForm({ ...editForm, faculty: [...(editForm.faculty || []), { name: "", designation: "", department: "", email: "", phone: "" }] })} className="w-full py-2 border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-500 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 hover:border-primary hover:text-primary transition-colors"><Plus size={16} /> Add Teacher</button>
                                                    <div className="flex gap-2 pt-2">
                                                        <button onClick={() => handleEditSave("faculty")} disabled={savingSection === "faculty"} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white font-bold rounded-xl text-xs hover:shadow-lg transition-all">{savingSection === "faculty" ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save</button>
                                                        <button onClick={() => setEditingSection(null)} className="flex items-center gap-1 px-4 py-2 bg-gray-100 dark:bg-[#161620] text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs border border-gray-200 dark:border-gray-700"><X size={14} /> Cancel</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {selectedCollege.faculty.length === 0 ? (
                                                        <div className="col-span-full py-20 text-center bg-gray-50 dark:bg-[#0C0C10] rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800">
                                                            <Users size={32} className="mx-auto text-gray-300 mb-3" />
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 font-black uppercase tracking-widest">No faculty members listed yet.</p>
                                                        </div>
                                                    ) : selectedCollege.faculty.map((teacher: any, i: number) => (
                                                        <motion.div
                                                            key={i}
                                                            initial={{ opacity: 0, y: 20 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            whileHover={{ y: -3 }}
                                                            transition={{ delay: i * 0.05, type: "spring", stiffness: 200 }}
                                                            className="group/card flex gap-3 sm:gap-5 p-3.5 sm:p-5 rounded-2xl sm:rounded-[2rem] bg-white dark:bg-[#1C1C26] border border-gray-100 dark:border-gray-800/60 shadow-sm hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 overflow-hidden relative"
                                                        >
                                                            <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-xl sm:rounded-2xl overflow-hidden shadow-lg shrink-0 relative border-2 border-white dark:border-gray-700 transition-all duration-500 group-hover/card:border-primary/40">
                                                                {teacher.photo ? (
                                                                    <Image src={teacher.photo} alt={teacher.name} fill className="object-cover transition-transform duration-700 group-hover/card:scale-110" />
                                                                ) : (
                                                                    <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary/40 font-black text-xl sm:text-3xl uppercase">
                                                                        {teacher.name[0]}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0 pr-4">
                                                                <div className="h-full flex flex-col justify-center">
                                                                    <h4 className="text-[15px] font-black font-bengali text-gray-900 dark:text-white truncate tracking-normal mb-1">{teacher.name}</h4>
                                                                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2">{teacher.designation}</p>
                                                                    <div className="flex items-center gap-2 mb-4">
                                                                        <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
                                                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">{teacher.department}</p>
                                                                    </div>

                                                                    <div className="flex items-center gap-2">
                                                                        <LandingButton href={`mailto:${teacher.email}`} icon={Mail} />
                                                                        <LandingButton href={`tel:${teacher.phone}`} icon={Phone} />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {/* Decorative element */}
                                                            <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/5 rounded-full blur-3xl opacity-0 group-hover/card:opacity-100 transition-opacity pointer-events-none" />
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'clubs' && (
                                        <div className="bg-white dark:bg-[#161620] rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 border border-gray-100 dark:border-white/10 shadow-sm dark:shadow-black/20 min-h-[300px]">
                                            <div className="flex items-center justify-between mb-4 sm:mb-6">
                                                <h3 className="text-xs sm:text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-2 sm:gap-3">
                                                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-primary/10 flex items-center justify-center"><Trophy size={12} className="text-primary sm:w-[14px] sm:h-[14px]" /></div>
                                                    Active Clubs
                                                </h3>
                                                {(profile?.role === "admin" || profile?.role === "super_manager" || (profile?.role === "manager" && profile.collegeId === selectedCollege.id) || profile?.clubPosition === "President") && (
                                                    <button onClick={() => setShowClubManager(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 text-gray-500 rounded-lg text-[10px] font-black uppercase tracking-widest hover:text-primary border border-gray-100 dark:border-gray-700 transition-colors">
                                                        <Settings size={12} />
                                                        Manage
                                                    </button>
                                                )}
                                            </div>

                                            {clubsLoading ? (
                                                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                                    <Loader2 size={32} className="animate-spin mb-4" />
                                                    <p className="text-xs font-black uppercase tracking-widest">Hydrating Club Data...</p>
                                                </div>
                                            ) : clubs.length > 0 ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {clubs.map((club) => (
                                                        <ClubCard key={club.id} club={club} onClick={() => setSelectedClub(club)} />
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-20 bg-gray-50 dark:bg-[#0C0C10] rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-800">
                                                    <Trophy size={40} className="mx-auto text-gray-300 mb-4 stroke-1" />
                                                    <p className="text-xs text-gray-500 font-black uppercase tracking-widest mb-2">No active clubs registered yet</p>
                                                    {(profile?.role === "admin" || profile?.role === "super_manager" || profile?.role === "manager") && (
                                                        <button onClick={() => setShowClubManager(true)} className="mt-4 px-6 py-2 bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl shadow-lg shadow-primary/30 hover:shadow-primary/40 transition-all active:scale-95">Initialize First Club</button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'gallery' && (
                                        <div className="bg-white dark:bg-[#161620] rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 border border-gray-100 dark:border-gray-800/50 shadow-sm dark:shadow-black/20 min-h-[300px]">
                                            <div className="flex items-center justify-between mb-4 sm:mb-8">
                                                <div>
                                                    <h3 className="text-xs sm:text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-2 sm:gap-3">
                                                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-primary/10 flex items-center justify-center"><ImageIcon size={12} className="text-primary sm:w-[14px] sm:h-[14px]" /></div>
                                                        Gallery
                                                    </h3>
                                                    <p className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5 sm:mt-1 ml-7 sm:ml-9">A visual journey through our campus</p>
                                                </div>
                                                {permissions.allowed && (
                                                    <button
                                                        onClick={() => setShowGalleryUpload(true)}
                                                        className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-primary text-white rounded-lg sm:rounded-xl text-[10px] font-black uppercase tracking-widest hover:shadow-lg transition-all active:scale-95"
                                                    >
                                                        <Plus size={13} /> <span className="hidden sm:inline">Add</span> Photo
                                                    </button>
                                                )}
                                            </div>

                                            {showGalleryUpload && (
                                                <div className="mb-8 p-6 bg-gray-50 dark:bg-[#0C0C10] rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800">
                                                    <div className="flex flex-col md:flex-row gap-6">
                                                        <div className="w-full md:w-1/2 aspect-video rounded-xl bg-white dark:bg-[#161620] overflow-hidden relative border border-gray-100 dark:border-gray-800 flex items-center justify-center">
                                                            {galleryPreview ? (
                                                                <Image src={galleryPreview} alt="Preview" fill className="object-cover" />
                                                            ) : (
                                                                <label className="flex flex-col items-center justify-center p-8 w-full h-full gap-2 cursor-pointer text-gray-400 hover:text-primary transition-colors">
                                                                    <Camera size={32} />
                                                                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-center">Select Image</span>
                                                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                                                        const file = e.target.files?.[0];
                                                                        if (file) {
                                                                            setGalleryFile(file);
                                                                            setGalleryPreview(URL.createObjectURL(file));
                                                                        }
                                                                    }} />
                                                                </label>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 space-y-4">
                                                            <div className="space-y-1.5">
                                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block ml-1">Photo Caption</label>
                                                                <input
                                                                    type="text"
                                                                    placeholder="What's happening in this photo?"
                                                                    value={galleryCaption}
                                                                    onChange={(e) => setGalleryCaption(e.target.value)}
                                                                    className="w-full px-4 py-3 bg-white dark:bg-[#161620] border border-gray-100 dark:border-gray-800 rounded-xl text-sm"
                                                                />
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={async () => {
                                                                        if (!galleryFile || !galleryCaption) return;
                                                                        setGalleryUploading(true);
                                                                        try {
                                                                            const url = await uploadFile(`colleges/${selectedCollege.id}/gallery/${Date.now()}`, galleryFile);
                                                                            await addGalleryPhotoAction(profile!.uid!, selectedCollege.id, url, galleryCaption);
                                                                            setShowGalleryUpload(false);
                                                                            setGalleryFile(null);
                                                                            setGalleryPreview(null);
                                                                            setGalleryCaption("");
                                                                        } catch (e) {
                                                                            showToast("Failed to upload: " + (e as Error).message, "error");
                                                                        } finally {
                                                                            setGalleryUploading(false);
                                                                        }
                                                                    }}
                                                                    disabled={galleryUploading}
                                                                    className="flex-1 py-3 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                                                                >
                                                                    {galleryUploading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                                                    Post to Gallery
                                                                </button>
                                                                <button onClick={() => { setShowGalleryUpload(false); setGalleryPreview(null); }} className="px-5 py-3 bg-white dark:bg-[#161620] border border-gray-100 dark:border-gray-800 rounded-xl text-[10px] font-black text-gray-500 uppercase tracking-widest">Cancel</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4">
                                                {(selectedCollege.gallery || []).filter(item => item.url && item.url.trim() !== "").length === 0 ? (
                                                    <div className="col-span-full py-16 sm:py-20 text-center bg-gray-50 dark:bg-[#0C0C10] rounded-2xl sm:rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800">
                                                        <ImageIcon size={28} className="mx-auto text-gray-300 mb-3 sm:w-[32px] sm:h-[32px]" />
                                                        <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-black uppercase tracking-widest">No photos yet.</p>
                                                    </div>
                                                ) : (selectedCollege.gallery || []).filter(item => item.url && item.url.trim() !== "").map((item, i) => (
                                                    <motion.div
                                                        key={i}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: i * 0.05 }}
                                                        className="aspect-square rounded-xl sm:rounded-2xl overflow-hidden relative group cursor-pointer border border-gray-100 dark:border-gray-800"
                                                        onClick={() => setSelectedGalleryImage(item)}
                                                    >
                                                        <Image src={item.url} alt={item.caption} fill className="object-cover transition-transform duration-1000 group-hover:scale-110" />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-3 sm:p-5 sm:transform sm:translate-y-2 sm:group-hover:translate-y-0">
                                                            <p className="text-white text-xs font-bold leading-relaxed line-clamp-2 mb-2">{item.caption}</p>
                                                            <div className="flex items-center gap-2">
                                                                <div className="h-[2px] w-6 bg-primary rounded-full" />
                                                                <p className="text-white/70 text-[9px] font-black uppercase tracking-widest">{item.date}</p>
                                                            </div>
                                                        </div>
                                                        {permissions.allowed && (
                                                            <button
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    const confirmed = await confirm({
                                                                        title: "Delete from Gallery?",
                                                                        message: "This action cannot be undone. Are you sure you want to remove this memory?",
                                                                        confirmText: "Delete Photo",
                                                                        variant: "danger"
                                                                    });

                                                                    if (confirmed) {
                                                                        setConfirmLoading(true);
                                                                        try {
                                                                            await deleteFromCloudinary(item.url);
                                                                            await deleteGalleryPhotoAction(profile!.uid!, selectedCollege.id, item.url);
                                                                        } finally {
                                                                            setConfirmLoading(false);
                                                                            closeConfirm();
                                                                        }
                                                                    }
                                                                }}
                                                                className="absolute top-2 right-2 sm:top-3 sm:right-3 p-1.5 sm:p-2 bg-red-600/90 backdrop-blur-md text-white rounded-lg sm:rounded-xl sm:opacity-0 sm:group-hover:opacity-100 transition-all hover:bg-red-600 hover:scale-110 shadow-lg border border-red-500/20"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        )}
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    )}


                                    {/* Club Modals moved inside context */}
                                    {selectedClub && (
                                        <ClubDetailsModal
                                            club={selectedClub}
                                            onClose={() => setSelectedClub(null)}
                                        />
                                    )}

                                    {showClubManager && (
                                        <ClubManager
                                            collegeId={selectedCollege.id}
                                            onClose={() => setShowClubManager(false)}
                                        />
                                    )}

                                    {/* Last Updated */}
                                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-gray-600 dark:text-gray-500 px-1 sm:px-2 pb-24 lg:pb-4">
                                        <Clock size={11} />Last updated by <strong className="text-gray-900 dark:text-gray-300">{selectedCollege.lastUpdatedBy}</strong> · {selectedCollege.lastUpdatedDate}
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </main>

                    {/* ─── Mobile Sticky Bottom Navigation ─── */}
                    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-black/95 backdrop-blur-2xl border-t border-gray-100 dark:border-white/10 pb-safe z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
                        <div className="flex items-center justify-around px-2 py-3">
                            {[
                                { id: 'overview', label: 'Overview', icon: BookOpen },
                                { id: 'faculty', label: 'Faculty', icon: Users },
                                { id: 'clubs', label: 'Clubs', icon: Trophy },
                                { id: 'gallery', label: 'Gallery', icon: ImageIcon },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        setActiveTab(tab.id as any);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className={`relative flex flex-col items-center gap-1.5 p-2 w-16 transition-all ${activeTab === tab.id ? "text-primary" : "text-gray-400 dark:text-gray-500"
                                        }`}
                                >
                                    <tab.icon size={20} className={`transition-all duration-300 ${activeTab === tab.id ? "scale-110" : ""}`} />
                                    <span className="text-[9px] font-black uppercase tracking-wider">{tab.label}</span>
                                    {activeTab === tab.id && (
                                        <motion.div layoutId="mobileTabIndicator" className="absolute top-0 w-8 h-1 bg-primary rounded-b-full shadow-[0_2px_10px_rgba(var(--primary-rgb),0.5)]" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Mobile College Selector Modal ─── */}
            <AnimatePresence>
                {isMobileSelectorOpen && (
                    <div className="lg:hidden fixed inset-0 z-[200] flex flex-col bg-white dark:bg-[#0C0C10]">
                        <motion.div
                            initial={{ opacity: 0, y: "100%" }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="flex flex-col h-full w-full relative"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
                                <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                                    <School className="text-primary" size={20} /> Select Institution
                                </h2>
                                <button
                                    onClick={() => setIsMobileSelectorOpen(false)}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 dark:bg-[#161620] text-gray-500 active:scale-95 transition-transform"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Search & Filters */}
                            <div className="p-4 space-y-4 border-b border-gray-100 dark:border-gray-800">
                                <div className="relative group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search colleges..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-[#161620] border border-gray-100 dark:border-gray-800 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all dark:text-white font-medium placeholder:text-gray-400"
                                    />
                                </div>
                                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                                    {divisions.map(div => (
                                        <button
                                            key={div}
                                            onClick={() => setSelectedDivision(div)}
                                            className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${selectedDivision === div
                                                    ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                                                    : "bg-gray-50 dark:bg-[#161620] text-gray-500 border-gray-100 dark:border-gray-800"
                                                }`}
                                        >
                                            {div}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* List */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {filteredColleges.length > 0 ? (
                                    filteredColleges.map((college) => (
                                        <button
                                            key={college.id}
                                            onClick={() => handleCollegeSelect(college)}
                                            className={`w-full flex items-center gap-4 p-3.5 rounded-2xl transition-all relative border ${selectedCollege.id === college.id
                                                    ? "bg-primary/5 border-primary/20"
                                                    : "bg-white dark:bg-[#0C0C10] border-gray-100 dark:border-gray-800"
                                                }`}
                                        >
                                            <div className={`flex-shrink-0 w-12 h-12 rounded-xl border flex items-center justify-center ${selectedCollege.id === college.id
                                                    ? "bg-white dark:bg-[#1E1E2E] border-primary/30 shadow-md"
                                                    : "bg-gray-50 dark:bg-[#161620] border-gray-100 dark:border-gray-800"
                                                }`}>
                                                {college.hasLogo ? <Image src={college.logo} alt="" width={32} height={32} className="object-contain" /> : <School size={20} className="text-gray-400" />}
                                            </div>
                                            <div className="text-left overflow-hidden flex-1">
                                                <h3 className={`text-sm font-black truncate ${selectedCollege.id === college.id ? "text-primary" : "text-gray-900 dark:text-gray-100"}`}>
                                                    {college.shortName}
                                                </h3>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{college.division}</p>
                                            </div>
                                            {selectedCollege.id === college.id && (
                                                <div className="w-2 h-2 rounded-full bg-primary" />
                                            )}
                                        </button>
                                    ))
                                ) : (
                                    <div className="py-12 text-center">
                                        <Search size={32} className="mx-auto text-gray-300 mb-2 opacity-20" />
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-relaxed">No institutions found</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Photo Full-Screen Viewer (Lightbox) */}
            <AnimatePresence>
                {selectedGalleryImage && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md" onClick={() => setSelectedGalleryImage(null)}>
                        <motion.button
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            onClick={() => setSelectedGalleryImage(null)}
                            className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center z-[120] backdrop-blur-sm transition-all"
                        >
                            <X size={24} />
                        </motion.button>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="relative w-full h-full max-h-[85vh] flex flex-col items-center justify-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Image
                                src={selectedGalleryImage.url}
                                alt={selectedGalleryImage.caption}
                                fill
                                className="object-contain"
                                priority
                            />
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="absolute bottom-10 max-w-2xl w-full px-6 py-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 text-center"
                            >
                                <h3 className="text-white font-bold text-lg mb-1">{selectedGalleryImage.caption}</h3>
                                <div className="flex items-center justify-center gap-2 text-white/50 text-sm">
                                    <span className="font-medium text-white/80">{selectedGalleryImage.uploadedBy}</span>
                                    <span>•</span>
                                    <span>{selectedGalleryImage.date}</span>
                                </div>
                            </motion.div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

/* ─── Exported Page with Suspense ─── */
export default function CollegeInfoPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-[#0C0C10] flex items-center justify-center"><p className="text-gray-400">Loading...</p></div>}>
            <CollegeInfoInner />
        </Suspense>
    );
}

