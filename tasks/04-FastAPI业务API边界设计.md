# 04 FastAPI 业务 API 边界设计

## 研究目标

确定前端、FastAPI、Agno、Nango 之间的 API 边界，保证业务权限、工具权限、审批和审计都收敛在业务后端。

## 业务场景

前端只调用 FastAPI。FastAPI 负责创建 run、调用 Agno、检查 tool permission、触发 Nango、创建 approval 和写 audit_log。

## 需要阅读的源码

- Agno Agent / Workflow 调用接口。
- Agno streaming / background run。
- Agno approval resume 机制。
- Nango API 调用方式。
- Vercel AI SDK 前端 streaming 消费方式。

## 源码阅读结论

待补充。

## 技术可行性判断

待补充。

## 推荐实现方案

待补充。

## 数据结构或 API 设计

待补充。

## 风险点

待补充。

## 第一版取舍

待补充。

## 后续实现任务

待补充。

## 结论

待补充。

