export type ShopifyProductSnapshot = {
  productId: string;
  shopId: string;
  title: string;
  description: string;
  seoKeywords: string[];
};

export type ListingDiff = {
  productId: string;
  titleBefore: string;
  titleAfter: string;
  descriptionBefore: string;
  descriptionAfter: string;
  seoKeywords: string[];
};

