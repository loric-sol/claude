import type { ThemeId } from "./themes";

/** Public profile data. Deliberately excludes owner account details. */
export interface PublicBusiness {
  id: string;
  name: string;
  slug: string;
  category: string;
  location: string;
  description: string;
  logo_url: string | null;
  cover_image_url: string | null;
  theme: ThemeId;
  general_booking_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  whatsapp_number: string | null;
  address: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  website_url: string | null;
  published: boolean;
  is_demo: boolean;
}

export interface Business extends PublicBusiness {
  owner_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  business_id: string;
  name: string;
  description: string;
  price_pence: number;
  price_from: boolean;
  currency: string;
  duration_minutes: number;
  image_url: string | null;
  booking_url: string | null;
  display_order: number;
  active: boolean;
}

export interface GalleryImage {
  id: string;
  business_id: string;
  image_url: string;
  caption: string;
  display_order: number;
}

export interface Review {
  id: string;
  business_id: string;
  author_name: string;
  rating: number;
  body: string;
  source: string;
  is_sample: boolean;
  display_order: number;
}

export interface Faq {
  id: string;
  business_id: string;
  question: string;
  answer: string;
  display_order: number;
}

export interface User {
  id: string;
  email: string;
  is_demo: boolean;
}

export type EventType = "page_view" | "booking_click" | "social_click" | "contact_click";
