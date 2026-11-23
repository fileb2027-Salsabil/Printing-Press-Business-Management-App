export interface ProcessedImageResult {
  dataUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
}

export function validateAndProcessImage(
  file: File,
  maxSizeBytes: number = 3 * 1024 * 1024, // 3MB default
  maxWidth: number = 1000,
  maxHeight: number = 1000
): Promise<ProcessedImageResult> {
  return new Promise((resolve, reject) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return reject(new Error('শুধুমাত্র JPG, JPEG, PNG এবং WebP ফরম্যাট গ্রহণযোগ্য।'));
    }

    if (file.size > maxSizeBytes) {
      return reject(new Error('ফাইলের আকার সর্বোচ্চ ৩ মেগাবাইট (3MB) হতে পারে।'));
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Calculate scaled dimensions to avoid storing excessively large base64
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('ক্যানভাস কনটেক্সট তৈরি করা যায়নি।'));
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Use webp or jpeg compression
        const quality = 0.85;
        const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(outputType, quality);

        resolve({
          dataUrl,
          width,
          height,
          sizeBytes: Math.round(dataUrl.length * 0.75),
        });
      };
      img.onerror = () => reject(new Error('ছবি লোড করা ব্যর্থ হয়েছে।'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('ফাইল পড়তে ব্যর্থ হয়েছে।'));
    reader.readAsDataURL(file);
  });
}
