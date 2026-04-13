/**
 * TikTok Deep Link Utility
 * Opens TikTok app directly on mobile with fallback to web
 */

// Detect device type
const isIOS = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

const isAndroid = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /Android/.test(navigator.userAgent);
};

const isMobile = (): boolean => isIOS() || isAndroid();

// Extract video ID from TikTok URL
export const extractVideoId = (url: string): string | null => {
  if (!url) return null;
  const match = url.match(/video\/(\d+)/);
  return match ? match[1] : null;
};

// Extract username from TikTok URL
export const extractUsername = (url: string): string | null => {
  if (!url) return null;
  const match = url.match(/@([^/?]+)/);
  return match ? match[1] : null;
};

/**
 * Opens TikTok link with deep link support
 * - iOS: Uses snssdk1233:// scheme
 * - Android: Uses Intent URL
 * - Desktop: Opens web URL directly
 */
export const openTikTokLink = (url: string): void => {
  if (!url) return;

  const videoId = extractVideoId(url);
  const username = extractUsername(url);

  // Desktop - open web URL directly
  if (!isMobile()) {
    window.open(url, '_blank');
    return;
  }

  let deepLink: string | null = null;
  const webUrl = url;

  // Build deep link based on URL type and device
  if (videoId) {
    // Video URL
    if (isIOS()) {
      deepLink = `snssdk1233://aweme/detail/${videoId}`;
    } else if (isAndroid()) {
      deepLink = `intent://aweme/detail/${videoId}#Intent;package=com.zhiliaoapp.musically;scheme=snssdk1233;end`;
    }
  } else if (username) {
    // Profile URL
    if (isIOS()) {
      deepLink = `snssdk1233://user/profile/${username}`;
    } else if (isAndroid()) {
      deepLink = `intent://user/profile/${username}#Intent;package=com.zhiliaoapp.musically;scheme=snssdk1233;end`;
    }
  }

  if (!deepLink) {
    // Fallback to web if we can't build a deep link
    window.open(webUrl, '_blank');
    return;
  }

  // Try to open the app with timeout fallback to web
  const timeout = 1500;
  const start = Date.now();

  // Create hidden iframe for iOS deep link (works better than window.location)
  if (isIOS()) {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = deepLink;
    document.body.appendChild(iframe);
    
    setTimeout(() => {
      document.body.removeChild(iframe);
      // If still on page after timeout, app didn't open - fallback to web
      if (Date.now() - start < timeout + 100) {
        window.open(webUrl, '_blank');
      }
    }, timeout);
  } else {
    // Android - use window.location
    window.location.href = deepLink;
    
    setTimeout(() => {
      // If still on page after timeout, fallback to web
      if (document.hasFocus()) {
        window.open(webUrl, '_blank');
      }
    }, timeout);
  }
};

/**
 * Opens TikTok profile by username
 */
export const openTikTokProfile = (username: string): void => {
  const cleanUsername = username.replace('@', '');
  openTikTokLink(`https://www.tiktok.com/@${cleanUsername}`);
};

/**
 * Opens TikTok video by ID
 */
export const openTikTokVideo = (videoId: string): void => {
  openTikTokLink(`https://www.tiktok.com/@user/video/${videoId}`);
};
