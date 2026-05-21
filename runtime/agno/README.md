# Agno Runtime Adapter

本目录用于承载 PrimeAgent 自己的 Agno 适配层。

约束：

- 不直接修改 Agno 上游源码。
- Runtime Builder 负责把业务版本快照转换成 Agno Agent / Team / Workflow。
- 写外部系统的能力只能通过 Tool Gateway callable 暴露。
- Agno trace 需要转换成平台 RunGraph。

