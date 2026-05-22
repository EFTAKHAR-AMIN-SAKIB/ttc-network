/**
 * TTC College Data — Central source of truth
 * ============================================
 * Admin-editable: Add/remove colleges here and every page updates automatically.
 * When the admin panel is connected to a database, this file becomes a DB read.
 *
 * All 15 Government Teachers' Training Colleges of Bangladesh
 */

export interface College {
    id: string;
    name: string;
    nameBn: string;
    logo: string;
    city: string;
    established: number;
    slug: string;
    hasLogo: boolean; // false = placeholder; admin can upload later
}

export const colleges: College[] = [
    // ── Colleges with logos ──────────────────────────────
    {
        id: "feni",
        name: "Govt. Teachers' Training College, Feni",
        nameBn: "সরকারি টিচার্স ট্রেনিং কলেজ, ফেনী",
        logo: "/logos/feni.png",
        city: "Feni",
        established: 1962,
        slug: "feni",
        hasLogo: true,
    },
    {
        id: "dhaka",
        name: "Govt. Teachers' Training College, Dhaka",
        nameBn: "সরকারি টিচার্স ট্রেনিং কলেজ, ঢাকা",
        logo: "/logos/dhaka.png",
        city: "Dhaka",
        established: 1909,
        slug: "dhaka",
        hasLogo: true,
    },
    {
        id: "rajshahi",
        name: "Govt. Teachers' Training College, Rajshahi",
        nameBn: "সরকারি টিচার্স ট্রেনিং কলেজ, রাজশাহী",
        logo: "/logos/rajshahi.png",
        city: "Rajshahi",
        established: 1955,
        slug: "rajshahi",
        hasLogo: true,
    },
    {
        id: "cumilla",
        name: "Govt. Teachers' Training College, Cumilla",
        nameBn: "সরকারি টিচার্স ট্রেনিং কলেজ, কুমিল্লা",
        logo: "/logos/cumilla.png",
        city: "Cumilla",
        established: 1962,
        slug: "cumilla",
        hasLogo: true,
    },
    {
        id: "sylhet",
        name: "Govt. Teachers' Training College, Sylhet",
        nameBn: "সরকারি টিচার্স ট্রেনিং কলেজ, সিলেট",
        logo: "/logos/sylhet.png",
        city: "Sylhet",
        established: 1946,
        slug: "sylhet",
        hasLogo: true,
    },
    {
        id: "chattagram",
        name: "Govt. Teachers' Training College, Chattagram",
        nameBn: "সরকারি টিচার্স ট্রেনিং কলেজ, চট্টগ্রাম",
        logo: "/logos/chattagram.png",
        city: "Chattagram",
        established: 1958,
        slug: "chattagram",
        hasLogo: true,
    },

    // ── Colleges without logos (placeholder) ─────────────
    {
        id: "rangpur",
        name: "Govt. Teachers' Training College, Rangpur",
        nameBn: "সরকারি টিচার্স ট্রেনিং কলেজ, রংপুর",
        logo: "",
        city: "Rangpur",
        established: 1882,
        slug: "rangpur",
        hasLogo: false,
    },
    {
        id: "khulna",
        name: "Govt. Teachers' Training College, Khulna",
        nameBn: "সরকারি টিচার্স ট্রেনিং কলেজ, খুলনা",
        logo: "",
        city: "Khulna",
        established: 1970,
        slug: "khulna",
        hasLogo: false,
    },
    {
        id: "mymensingh",
        name: "Govt. Women's Teachers' Training College, Mymensingh",
        nameBn: "সরকারি মহিলা টিচার্স ট্রেনিং কলেজ, ময়মনসিংহ",
        logo: "",
        city: "Mymensingh",
        established: 1952,
        slug: "mymensingh",
        hasLogo: false,
    },
    {
        id: "mymensingh_coed",
        name: "Govt. Teachers' Training College, Mymensingh",
        nameBn: "সরকারি টিচার্স ট্রেনিং কলেজ, ময়মনসিংহ",
        logo: "",
        city: "Mymensingh",
        established: 1948,
        slug: "mymensingh-coed",
        hasLogo: false,
    },
    {
        id: "bogura",
        name: "Govt. B.Ed College, Bogura",
        nameBn: "সরকারি বি.এড কলেজ, বগুড়া",
        logo: "https://res.cloudinary.com/dqmqvynxo/image/upload/v1775406576/ttc-connect/logos/aoij4zt9ikuemwmvfkqd.jpg",
        city: "Bogura",
        established: 2000,
        slug: "bed-bogura",
        hasLogo: true,
    },
    {
        id: "jashore",
        name: "Govt. Teachers' Training College, Jashore",
        nameBn: "সরকারি টিচার্স ট্রেনিং কলেজ, যশোর",
        logo: "",
        city: "Jashore",
        established: 1963,
        slug: "jashore",
        hasLogo: false,
    },
    {
        id: "barishal",
        name: "Shaheed Abdur Rab Serniabat Teachers' Training College, Barishal",
        nameBn: "শহীদ আবদুর রব সেরনিয়াবাত টিচার্স ট্রেনিং কলেজ, বরিশাল",
        logo: "",
        city: "Barishal",
        established: 1999,
        slug: "barishal",
        hasLogo: false,
    },
    {
        id: "faridpur",
        name: "Govt. Teachers' Training College, Faridpur",
        nameBn: "সরকারি টিচার্স ট্রেনিং কলেজ, ফরিদপুর",
        logo: "",
        city: "Faridpur",
        established: 2005,
        slug: "faridpur",
        hasLogo: false,
    },
    {
        id: "pabna",
        name: "Govt. B.Ed College, Pabna",
        nameBn: "সরকারি বি.এড কলেজ, পাবনা",
        logo: "",
        city: "Pabna",
        established: 1998,
        slug: "pabna",
        hasLogo: false,
    },

];

export const TOTAL_TTCS = 15;
