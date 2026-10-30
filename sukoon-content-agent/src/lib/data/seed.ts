import type { Organization } from "@/lib/validation/schema";

/** Facts below come from the client demo site (sukoon-studio.html). */
export const sukoonWebsite = "https://fde-client-company-demos.aaryanptl.chatgpt.site/sukoon-studio.html";

export const seedOrganization: Organization = {
  id: "sukoon-studio",
  name: "Sukoon Studio",
  website: sukoonWebsite,
  industry: "Meditation and wellness (live online classes)",
  description: "Pune-based studio offering short, live online meditation classes on Zoom with a real teacher, at workday-friendly times. Tagline: \"Ten quiet minutes, live with a teacher.\" 12 trained teachers; 9,000+ people have joined. All times are IST.",
  services: "Daily live Zoom classes: Morning Calm (7:00 AM, daily, 20 min); Lunch Reset (1:15 PM, Mon–Fri, 15 min, camera optional); Sleep Wind-down (10:00 PM, daily, 30 min); Weekend Deep Session (9:00 AM, Saturday, 60 min). Pricing: first class free for new students; Membership ₹1,499/month (unlimited live classes and recordings, cancel anytime); Single class ₹199 paid by UPI. Corporate wellness sessions for teams.",
  audience: "Busy working professionals and beginners across India who want short, guided calm in their day; also HR/people teams looking for team wellness sessions.",
  voice: "Calm, welcoming, grounded, encouraging, and clear. Warm and human, never preachy.",
  messages: "Ten quiet minutes is enough to begin. A real teacher, live, at times that fit your workday. Your first class is free. Booking is as easy as saying 'Hi' on WhatsApp.",
  preferences: "Useful, human-sounding content; gentle calls to action; avoid pressure and exaggerated promises. Content for Indian audiences in the language chosen per channel.",
  prohibited: "Unsupported health or therapeutic claims (meditation is not a substitute for medical or mental health care); guaranteed outcomes; invented testimonials, prices, schedules, teacher names or credentials. Do not invent links or phone numbers — use placeholders like [WhatsApp booking link].",
  callsToAction: "Book your free first class; Say 'Hi' on WhatsApp [WhatsApp booking link]; Pick a class on the website [Website link]; Teams: Talk to us [Corporate enquiry link].",
  colors: "Deep forest green, muted sage, warm off-white, and soft neutral tones.",
  version: 1,
};
