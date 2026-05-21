# Nango Integration Adapter

本目录用于承载 PrimeAgent 自己的 Nango 适配层。

约束：

- 不直接修改 Nango 上游源码。
- Nango 只负责 OAuth、connection、token refresh 和 provider token。
- Connector Gateway 负责租户映射、scope 校验、错误转换和领域对象归一化。
- Agent / Team / Workflow / Orchestrator 不能直接拿 provider token。

