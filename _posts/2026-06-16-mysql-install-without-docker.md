---
layout: post
title: "mysql裸机安装【无网络】"
date: 2026-06-16 10:00:00 +0800
author: ed
description: "mysql裸机安装无网络情况"
categories: 
  - linux
  - 运维
  - mysql
tags:
  - mysql
---

## mysql install without docker and network

### 安装rpm
从[这里下载所有的rpm](https://www.alipan.com/s/GgCTNJrgvMx), 然后执行`yum localinstall *`

### 【1】准备目录

```shell
mkdir -p /data/ed/data/mysql/data
# 全部目录授权给mysql用户
chown -R mysql:mysql /data/ed/data/mysql
chmod 700 /data/ed/data/mysql/data
```
和my.cnf 放到/data/ed/data/mysql/data/conf
```shell
[mysqld]
federated
# data dir is required
datadir=/data/ed/data/mysql/data
socket=/data/ed/data/mysql/data/mysql.sock
slow-query-log-file = /data/ed/data/mysql/mysql-slow.log
user=mysql
port=23306
slow-query-log = on
long_query_time = 2
lower_case_table_names=1
# unit seconds
interactive_timeout=86400
wait_timeout=86400
max_allowed_packet=500M
max_connections=1024
skip-name-resolve
innodb_buffer_pool_size = 8G
innodb_buffer_pool_instances = 8
innodb_log_file_size = 1G
log_bin=master-bin
server-id=1000
expire-logs-days=14
binlog_ignore_db=mysql
binlog_ignore_db=information_schema
binlog_ignore_db=performance_schema
binlog_ignore_db=sys
character-set-server=utf8mb4
collation-server=utf8mb4_general_ci
default-time-zone='+8:00'


sql_mode=STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION
group_concat_max_len = 10485760
log_bin_trust_function_creators=1


[mysql]
default-character-set=utf8mb4

```

### 【2】执行初始化：
指定/usr/sbin 来调用确认的mysql版本，如果有的话：
```shell
/usr/sbin/mysqld --defaults-file=/data/ed/data/mysql/conf/my.cnf --initialize
```

### 【3】后台启动
```shell
/usr/sbin/mysqld --defaults-file=/data/ed/data/mysql/conf/my.cnf --initialize

```

### 【4】通过socket链接：后 修改密码, 这里就是使用上一步初始化的临时密码
```shell
mysql -S /data/ed/data/mysql/data/mysql.sock -uroot -p

ALTER USER 'root'@'localhost' IDENTIFIED BY 'Root@2026ed';
CREATE USER 'root'@'127.0.0.1' IDENTIFIED BY 'Root@2026ed';
CREATE USER 'root'@'%' IDENTIFIED BY 'Root@2026ed';
GRANT ALL PRIVILEGES ON *.* TO 'root'@'127.0.0.1' WITH GRANT OPTION;
GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION;
FLUSH PRIVILEGES;
```

### 【5】后续这样链接：
mysql -uroot -p -P23306 --protocol=tcp