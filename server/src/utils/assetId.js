export const generateAssetId = (count) => {
  const nextNumber = String(count + 1).padStart(3, '0');
  return `AF-${nextNumber}`;
};