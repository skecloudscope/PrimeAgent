# Shopify Integration

本目录用于承载 Shopify 领域工具和 payload 转换。

第一阶段先使用 mock 读写，接口形状保持贴近真实 Tool Gateway：

- read product snapshot。
- build ListingDiff。
- freeze approval diff。
- write approved diff。

