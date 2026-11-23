import React from 'react';
import { Phone, MessageCircle } from 'lucide-react';

interface PhoneLinkProps {
  phone?: string | null;
  className?: string;
  showIcon?: boolean;
  showWhatsApp?: boolean;
  label?: string;
}

/**
 * Normalizes phone numbers to standard international format for tel: and wa.me links
 */
export function normalizePhoneForDialing(phoneNumber: string): string {
  // Replace Bengali digits with English digits
  const bnToEn: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
  };
  let clean = phoneNumber.replace(/[০-৯]/g, (d) => bnToEn[d] || d);

  // Keep only digits and '+'
  clean = clean.replace(/[^0-9+]/g, '');

  // If local Bangladesh format starting with 01X, prefix with +88
  if (/^01[3-9]\d{8}$/.test(clean)) {
    return `+88${clean}`;
  }
  return clean;
}

/**
 * Click-to-Call PhoneLink Component:
 * Turns any mobile number into an instant dialable link (tel:) with optional WhatsApp action.
 */
export const PhoneLink: React.FC<PhoneLinkProps> = ({
  phone,
  className = '',
  showIcon = true,
  showWhatsApp = false,
  label,
}) => {
  if (!phone || !phone.trim()) {
    return <span className="text-slate-400">ফোন নেই</span>;
  }

  // Handle multiple comma-separated or slash-separated phone numbers
  const rawList = phone.split(/[,/|]+/).map((p) => p.trim()).filter(Boolean);

  return (
    <span className={`inline-flex items-center flex-wrap gap-1.5 ${className}`}>
      {label && <span className="text-slate-500 mr-0.5">{label}</span>}
      {rawList.map((num, idx) => {
        const dialNumber = normalizePhoneForDialing(num);
        const waNumber = dialNumber.replace(/[^0-9]/g, '');

        return (
          <span key={idx} className="inline-flex items-center space-x-1 group">
            <a
              href={`tel:${dialNumber}`}
              className="inline-flex items-center space-x-1 text-emerald-700 hover:text-emerald-900 font-semibold hover:underline bg-emerald-50/70 hover:bg-emerald-100/90 px-1.5 py-0.5 rounded text-[11px] transition shadow-2xs"
              title={`কল করুন: ${num} (ক্লিক করলে ডায়াল হবে)`}
            >
              {showIcon && <Phone className="w-3 h-3 text-emerald-600 group-hover:scale-110 transition shrink-0" />}
              <span className="font-mono tracking-tight">{num}</span>
            </a>

            {showWhatsApp && waNumber.length >= 10 && (
              <a
                href={`https://wa.me/${waNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-0.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 rounded transition"
                title={`হোয়াটসঅ্যাপে মেসেজ পাঠান (${num})`}
              >
                <MessageCircle className="w-3 h-3" />
              </a>
            )}

            {idx < rawList.length - 1 && <span className="text-slate-300">,</span>}
          </span>
        );
      })}
    </span>
  );
};
