
graph TD
    subgraph Queues
      QA[data.ready]:::queue
      QB[chart.ready]:::queue
      QC[analysis.ready]:::queue
      QD[package.ready]:::queue
    end

    A[Data Collector (N8N)] --> QA
    QA --> B[Chart Generator (N8N)]
    B --> QB
    QB --> C[LLM Analyzer (N8N)]
    C --> QC
    QC --> D[Packager (N8N)]
    D --> QD
    QD --> E[Delivery Dispatcher (N8N)]

    classDef node fill:#f9f,stroke:#333,stroke-width:1px;
    classDef queue fill:#bbf,stroke:#222,stroke-width:1px,stroke-dasharray: 5 5;
    class A,B,C,D,E node;
    class QA,QB,QC,QD queue;

