export const redirectTo = (url: string) => {
  if (typeof window === 'undefined') return;
  window.location.assign(url);
};
