export const imageService = {
  /**
   * Upload image to ImgBB and return the URL.
   * Requires NEXT_PUBLIC_IMGBB_API_KEY env variable.
   */
  async upload(file) {
    const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
    if (!apiKey) throw new Error('IMGBB_API_KEY not configured');

    const formData = new FormData();
    formData.append('image', file);
    formData.append('key', apiKey);

    const res = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: formData,
    });

    const json = await res.json();
    if (!json.success) throw new Error(json.error?.message || 'Image upload failed');

    return {
      url: json.data.display_url,
      thumb_url: json.data.thumb?.url || json.data.display_url,
      delete_url: json.data.delete_url,
    };
  },
};
