export const APP_PLATFORMS = [
  {
    name: "Blinkit",
    category: "Groceries & Quick Commerce",
    pattern: /\b(blinkit|grofers)\b/i,
  },
  {
    name: "Zepto",
    category: "Groceries & Quick Commerce",
    pattern: /\bzepto\b/i,
  },
  {
    name: "Instamart",
    category: "Groceries & Quick Commerce",
    pattern: /\binstamart\b/i,
  },
  {
    name: "BigBasket",
    category: "Groceries & Quick Commerce",
    pattern: /\b(big\s?basket|bb\s?now)\b/i,
  },
  {
    name: "JioMart",
    category: "Groceries & Quick Commerce",
    pattern: /\bjio\s?mart\b/i,
  },
  {
    name: "Swiggy",
    category: "Food Delivery",
    pattern: /\bswiggy\b/i,
  },
  {
    name: "Zomato",
    category: "Food Delivery",
    pattern: /\bzomato\b/i,
  },
  {
    name: "Google services",
    category: "Digital Services",
    pattern: /\b(google play|google one|youtube premium|google india digital)\b/i,
  },
  {
    name: "Prime Video",
    category: "Subscriptions",
    pattern: /\b(prime video|amazon prime)\b/i,
  },
  {
    name: "Netflix",
    category: "Subscriptions",
    pattern: /\bnetflix\b/i,
  },
  {
    name: "Spotify",
    category: "Subscriptions",
    pattern: /\bspotify\b/i,
  },
  {
    name: "Uber",
    category: "Travel",
    pattern: /\buber\b/i,
  },
  {
    name: "Ola",
    category: "Travel",
    pattern: /\bola\b/i,
  },
  {
    name: "Rapido",
    category: "Travel",
    pattern: /\brapido\b/i,
  },
  {
    name: "Amazon",
    category: "Shopping",
    pattern: /\bamazon\b(?!\s+prime)/i,
  },
  {
    name: "Flipkart",
    category: "Shopping",
    pattern: /\bflipkart\b/i,
  },
  {
    name: "Meesho",
    category: "Shopping",
    pattern: /\bmeesho\b/i,
  },
  {
    name: "Myntra",
    category: "Shopping",
    pattern: /\bmyntra\b/i,
  },
] as const;

export function identifyAppPlatform(merchant: string) {
  return APP_PLATFORMS.find(({ pattern }) => pattern.test(merchant));
}
