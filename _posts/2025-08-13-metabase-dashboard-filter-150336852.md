---
layout: post
title: "metabase基础使用技巧 （dashboard, filter)"
date: 2025-08-13 09:36:26 +0800
author: gaoxingliang
description: "本文介绍了Metabase的基础功能和使用方法。主要包含三个核心功能：1）Question功能，通过可视化界面创建格式化的查询，支持数据筛选、分组和图表展示；2）SQL Query功能，支持直接编写SQL查询并定义变量；3）Filter功能，包括文本、数字、日期和字段筛选器，支持动态关联表字段。文章还讲解了如何实现Dashboard上的筛选器联动，通过连接查询字段实现多个查询的同步筛选效果。"
categories:
  - 迁移自CSDN
tags:
  - "metabase"
  - "bi"
  - "可视化"
  - "数据可视化"
csdn_url: "https://blog.csdn.net/scugxl/article/details/150336852"
---

这是[metabase系列分享文章](https://blog.csdn.net/scugxl/article/details/150003515)的第2部分。本文将介绍metabase的基础概念和使用介绍

## question

question是metabase中提供的通过UI化操作就能实现简单的 快捷 直接的BI查询。  
 点击右侧的New -> Question即可创建Question，可以理解为一个格式化的查询：  
 ![在这里插入图片描述]({{ '/assets/images/posts/metabase-dashboard-filter-150336852/img-001.png' | relative_url }})这里包含一个基础查询的各个部分，Data -》 主表， Filter -> where语句 Summarize + by 就是group by。  
 每一步右侧的箭头 可以只管预览数据。

点击左下角的Visulization齿轮，可以做对应图表的设置  
 ![在这里插入图片描述]({{ '/assets/images/posts/metabase-dashboard-filter-150336852/img-002.png' | relative_url }})  
 点击visualization 可以选择切换不同的显示图表：  
 ![在这里插入图片描述]({{ '/assets/images/posts/metabase-dashboard-filter-150336852/img-003.png' | relative_url }})

## sqlquery

SQLquery可以自行输入预期的sql，然后执行并查看。可以按照`{
{varnameXXX}}`的样式定义变量。  
 ![在这里插入图片描述]({{ '/assets/images/posts/metabase-dashboard-filter-150336852/img-004.png' | relative_url }})  
 详细的会在filter部分
