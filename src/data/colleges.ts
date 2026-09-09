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
    shortName: string;
    nameBn: string;
    shortNameBn?: string;
    logo: string;
    city: string;
    gender?: "women" | "men" | "coed";
    established: number;
    slug: string;
    hasLogo: boolean; // false = placeholder; admin can upload later
}

export const colleges: College[] = [
    // ── Colleges with logos ──────────────────────────────
    {
        id: "feni",
        name: "Govt. Teachers' Training College, Feni",
        shortName: "Feni TTC",
        nameBn: "সরকারি টিচার্স ট্রেনিং কলেজ, ফেনী",
        shortNameBn: "ফেনী টিটিসি",
        logo: "/logos/feni.png",
        city: "Feni",
        established: 1962,
        slug: "feni",
        hasLogo: true,
    },
    {
        id: "dhaka",
        name: "Govt. Teachers' Training College, Dhaka",
        shortName: "Dhaka TTC",
        nameBn: "সরকারি টিচার্স ট্রেনিং কলেজ, ঢাকা",
        shortNameBn: "ঢাকা টিটিসি",
        logo: "/logos/dhaka.png",
        city: "Dhaka",
        established: 1909,
        slug: "dhaka",
        hasLogo: true,
    },
    {
        id: "rajshahi",
        name: "Govt. Teachers' Training College, Rajshahi",
        shortName: "Rajshahi TTC",
        nameBn: "সরকারি টিচার্স ট্রেনিং কলেজ, রাজশাহী",
        shortNameBn: "রাজশাহী টিটিসি",
        logo: "/logos/rajshahi.png",
        city: "Rajshahi",
        established: 1955,
        slug: "rajshahi",
        hasLogo: true,
    },
    {
        id: "cumilla",
        name: "Govt. Teachers' Training College, Cumilla",
        shortName: "Cumilla TTC",
        nameBn: "সরকারি টিচার্স ট্রেনিং কলেজ, কুমিল্লা",
        shortNameBn: "কুমিল্লা টিটিসি",
        logo: "/logos/cumilla.png",
        city: "Cumilla",
        established: 1962,
        slug: "cumilla",
        hasLogo: true,
    },
    {
        id: "sylhet",
        name: "Govt. Teachers' Training College, Sylhet",
        shortName: "Sylhet TTC",
        nameBn: "সরকারি টিচার্স ট্রেনিং কলেজ, সিলেট",
        shortNameBn: "সিলেট টিটিসি",
        logo: "/logos/sylhet.png",
        city: "Sylhet",
        established: 1946,
        slug: "sylhet",
        hasLogo: true,
    },
    {
        id: "chattagram",
        name: "Govt. Teachers' Training College, Chattagram",
        shortName: "Chattagram TTC",
        nameBn: "সরকারি টিচার্স ট্রেনিং কলেজ, চট্টগ্রাম",
        shortNameBn: "চট্টগ্রাম টিটিসি",
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
        shortName: "Rangpur TTC",
        nameBn: "সরকারি টিচার্স ট্রেনিং কলেজ, রংপুর",
        shortNameBn: "রংপুর টিটিসি",
        logo: "",
        city: "Rangpur",
        established: 1882,
        slug: "rangpur",
        hasLogo: false,
    },
    {
        id: "khulna",
        name: "Govt. Teachers' Training College, Khulna",
        shortName: "Khulna TTC",
        nameBn: "সরকারি টিচার্স ট্রেনিং কলেজ, খুলনা",
        shortNameBn: "খুলনা টিটিসি",
        logo: "",
        city: "Khulna",
        established: 1970,
        slug: "khulna",
        hasLogo: false,
    },
    {
        id: "mymensingh",
        name: "Govt. Women's Teachers' Training College, Mymensingh",
        shortName: "Mymensingh TTC (Women)",
        nameBn: "সরকারি মহিলা টিচার্স ট্রেনিং কলেজ, ময়মনসিংহ",
        shortNameBn: "ময়মনসিংহ মহিলা টিটিসি",
        gender: "women",
        logo: "",
        city: "Mymensingh",
        established: 1952,
        slug: "mymensingh",
        hasLogo: false,
    },
    {
        id: "mymensingh_coed",
        name: "Govt. Teachers' Training College (Men), Mymensingh",
        shortName: "Mymensingh TTC (Men)",
        nameBn: "সরকারি টিচার্স ট্রেনিং কলেজ (পুরুষ), ময়মনসিংহ",
        shortNameBn: "ময়মনসিংহ পুরুষ টিটিসি",
        gender: "men",
        logo: "",
        city: "Mymensingh",
        established: 1948,
        slug: "mymensingh-coed",
        hasLogo: false,
    },
    {
        id: "bogura",
        name: "Govt. B.Ed College, Bogura",
        shortName: "Bogura TTC",
        nameBn: "সরকারি বি.এড কলেজ, বগুড়া",
        shortNameBn: "বগুড়া টিটিসি",
        logo: "https://res.cloudinary.com/dqmqvynxo/image/upload/v1775406576/ttc-connect/logos/aoij4zt9ikuemwmvfkqd.jpg",
        city: "Bogura",
        established: 2000,
        slug: "bed-bogura",
        hasLogo: true,
    },
    {
        id: "jashore",
        name: "Govt. Teachers' Training College, Jashore",
        shortName: "Jashore TTC",
        nameBn: "সরকারি টিচার্স ট্রেনিং কলেজ, যশোর",
        shortNameBn: "যশোর টিটিসি",
        logo: "",
        city: "Jashore",
        established: 1963,
        slug: "jashore",
        hasLogo: false,
    },
    {
        id: "barishal",
        name: "Shaheed Abdur Rab Serniabat Teachers' Training College, Barishal",
        shortName: "Barishal TTC",
        nameBn: "শহীদ আবদুর রব সেরনিয়াবাত টিচার্স ট্রেনিং কলেজ, বরিশাল",
        shortNameBn: "বরিশাল টিটিসি",
        logo: "",
        city: "Barishal",
        established: 1999,
        slug: "barishal",
        hasLogo: false,
    },
    {
        id: "faridpur",
        name: "Govt. Teachers' Training College, Faridpur",
        shortName: "Faridpur TTC",
        nameBn: "সরকারি টিচার্স ট্রেনিং কলেজ, ফরিদপুর",
        shortNameBn: "ফরিদপুর টিটিসি",
        logo: "",
        city: "Faridpur",
        established: 2005,
        slug: "faridpur",
        hasLogo: false,
    },
    {
        id: "pabna",
        name: "Govt. B.Ed College, Pabna",
        shortName: "Pabna TTC",
        nameBn: "সরকারি বি.এড কলেজ, পাবনা",
        shortNameBn: "পাবনা টিটিসি",
        logo: "",
        city: "Pabna",
        established: 1998,
        slug: "pabna",
        hasLogo: false,
    },

];

export const TOTAL_TTCS = 15;
