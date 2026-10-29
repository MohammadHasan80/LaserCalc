// ─────────────────────────────────────────────────────────────
// اطلاعات کسب‌وکار برای فاکتور
// Business info shown on the invoice header/footer
// ─────────────────────────────────────────────────────────────

/** ساختار قابل ویرایش اطلاعات کسب‌وکار */
export interface BusinessConfig {
  /** نام کوتاه کسب‌وکار */
  name: string;
  /** نام کامل با پیشوند (هدر فاکتور) */
  fullName: string;
  /** کپشن لاتین زیر نام در هدر (خالی = نمایش داده نمی‌شود) */
  latinCaption: string;
  /** شماره تماس فوتر (خالی = نمایش داده نمی‌شود) */
  phone: string;
  /** آی‌دی اینستاگرام فوتر بدون @ (خالی = نمایش داده نمی‌شود) */
  instagram: string;
  /** آدرس سایت فوتر (خالی = نمایش داده نمی‌شود) */
  website: string;
  /** آدرس فوتر (خالی = نمایش داده نمی‌شود) */
  address: string;
  /** توضیحات و شرایط پایین فاکتور (هر مورد یک رشته) */
  terms: string[];
  /** لوگوی اختصاصی روی هدر فاکتور — dataURL تصویر مربعی (اختیاری) */
  logo?: string;
}

export const BUSINESS = {
  /** نام کسب‌وکار (در هدر فاکتور) */
  name: "آذرخش تابلو باستان",
  /** نام کامل با پیشوند (فوتر و جاهای رسمی) */
  fullName: "شرکت آذرخش تابلو باستان",
  /** شماره تماس فوتر */
  phone: "09133601204",
  /** آی‌دی اینستاگرام فوتر (بدون @) */
  instagram: "azarakhshtabloo",
  /** آدرس سایت */
  website: "azarakhshtabloo.com",
  /** آدرس فوتر */
  address:
    "کاشان، بلوار شهدا، شهرک صنایع کارگاهی امیرکبیر، بلوار دانش یک، سرمایه سه",
} as const;

/** توضیحات و شرایط پایین فاکتور */
export const INVOICE_TERMS: string[] = [
  "قیمت‌ها بر اساس نرخ روز و متراژ برش اعلام‌شده محاسبه شده است.",
  "زمان تحویل: ۳ تا ۵ روز کاری پس از تأیید نهایی نقشه.",
  "هزینه حمل بر عهده مشتری است.",
  "در صورت تغییر در نقشه یا متراژ، قیمت‌ها مجدداً محاسبه می‌شود.",
  "این فاکتور به مدت ۷ روز اعتبار دارد.",
];

/** مقادیر پیش‌فرض اطلاعات کسب‌وکار (مبنای بازگشت) */
export const DEFAULT_BUSINESS: BusinessConfig = {
  name: BUSINESS.name,
  fullName: BUSINESS.fullName,
  latinCaption: "AZARAKHSH TABLO BASTAN CO.",
  phone: BUSINESS.phone,
  instagram: BUSINESS.instagram,
  website: BUSINESS.website,
  address: BUSINESS.address,
  terms: [...INVOICE_TERMS],
};
