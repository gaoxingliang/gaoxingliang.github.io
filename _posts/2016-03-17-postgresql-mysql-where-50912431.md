---
layout: post
title: "POSTGRESQL / mysql 索引区别(where)"
date: 2016-03-17 11:48:28 +0800
author: gaoxingliang
description: "在如下的表中:create table aaa(a int,b int,c int,d int);create index indexabc on aaa(a,b,c);对比是否使用到了索引: 发现postgresql的索引更加智能一些. 它可以使用索引集合的任意子集 而 mysql不行. 版本: mysql 5.6.22   postgresql: 9.5 官方文档参考:"
categories:
  - 迁移自CSDN
tags:
  - "postgresql"
  - "mysql"
  - "索引"
csdn_url: "https://blog.csdn.net/scugxl/article/details/50912431"
---

在如下的表中:

```
create table aaa
(
a int,
b int,
c int,
d int);

create index indexabc on aaa(a,b,c);
```

对比是否使用到了索引:   
 ![INDEX]({{ '/assets/images/posts/postgresql-mysql-where-50912431/img-001.png' | relative_url }})

发现postgresql的索引更加智能一些.   
 它可以使用索引集合的任意子集 而 mysql不行.   
 版本:   
 mysql 5.6.22 postgresql: 9.5   
 官方文档参考:   
 [mysql多列索引](http://dev.mysql.com/doc/refman/5.7/en/multiple-column-indexes.html)

> If an index exists on (col1, col2, col3), only the first two queries use the index. The third and fourth queries do involve indexed columns, but (col2) and (col2, col3) are not leftmost prefixes of (col1, col2, col3).

[postgresql多列索引](http://www.postgresql.org/docs/8.2/static/indexes-multicolumn.html)

> A multicolumn B-tree index can be used with query conditions that **involve any subset of the index’s columns**, but the index is most efficient when there are constraints on the leading (leftmost) columns. The exact rule is that equality constraints on leading columns, plus any inequality constraints on the first column that does not have an equality constraint, will be used to limit the portion of the index that is scanned. Constraints on columns to the right of these columns are checked in the index, so they save visits to the table proper, but they do not reduce the portion of the index that has to be scanned. For example, given an index on (a, b, c) and a query condition WHERE a = 5 AND b >= 42 AND c < 77, the index would have to be scanned from the first entry with a = 5 and b = 42 up through the last entry with a = 5. Index entries with c >= 77 would be skipped, but they’d still have to be scanned through. This index could in principle be used for queries that have constraints on b and/or c with no constraint on a — but the entire index would have to be scanned, so in most cases the planner would prefer a sequential table scan over using the index.
