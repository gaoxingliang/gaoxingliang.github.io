---
layout: post
title: "Apache+OpenSSL实现证书服务器提供HTTPS"
date: 2015-10-17 15:58:11 +0800
author: gaoxingliang
description: "http://hnlixf.iteye.com/blog/1771050通过 Linux+Apache+OpenSSL 实现 SSL （ Secure Socket Layer ）证书服务器，提供安全的 HTTPS （ Hypertext Transfer Protocol over Secure Socket Layer ）服务。 安装 SSL 1."
categories:
  - 迁移自CSDN
tags:
  - "openssl"
  - "ca"
csdn_url: "https://blog.csdn.net/scugxl/article/details/49204685"
---

http://hnlixf.iteye.com/blog/1771050

通过 Linux+Apache+OpenSSL 实现 SSL （ Secure Socket Layer ）证书服务器，提供安全的 HTTPS （ Hypertext Transfer Protocol over Secure Socket Layer ）服务。

安装 SSL

1.       安装 openssl

tar -zxvf openssl-0.9.8a.tar.gz

cd openssl-0.9.8a

./configure

make

make install

openssl 安装在 /usr/local/ssl 目录中

2.       安装 apache

tar -zxvf httpd-2.0.55.tar.gz

cd httpd-2.0.55

./configure –prefix=/usr/local/apache –enable-ssl   –enable-rewrite –enable-so –with-ssl=/usr/local/ssl

make

make install

apache 安装在 /usr/local/apache 目录中

以上是通过源码方式安装，最佳的安装方式通过 rpm 安装。先安装 apache 的 rpm ，再安装 openssl 的 rpm ， openssl 可自动安装到 apache 目录中。

证书介绍

SSL 安全证书可以自己生成，也可以通过第三方的 CA （ Certification Authority ）认证中心付费申请颁发。

SSL 安全证书包括：

1.       CA 证书，也叫根证书或中间级证书。单向认证的 https ， CA 证书是可选的。主要目的是使证书构成一个证书链，以达到浏览器信任证书的目的。如果使用了 CA 证书，服务器证书和客户证书都使用 CA 证书来签名。如果不安装 CA 证书，浏览器默认认为是不安全的。

2.       服务器证书。必选。通过服务器私钥，生成证书请求文件 CSR ，再通过 CA 证书签名生成服务器证书。

3.       客户证书。可选。如果有客户证书，就是双向认证的 HTTPS ，否则就是单向认证的 HTTPS 。生成步骤和服务器证书类似。

上面几种证书都可以自己生成。商业上，一般自己提供服务器或客户证书端的私钥和证书请求 CSR ，向第三方机构付费申请得到通过 CA 证书签名的服务器证书和客户证书。

生成证书

用 openssl 提供的工具 CA.sh 签名证书，证书放在 /usr/local/apache2/conf/ssl.crt 目录，先把工具拷贝过来：

cp /usr/share/ssl/misc/CA.sh /usr/local/apache2/conf/ssl.crt

 [ps:放哪里都可以的]

1.       CA 证书（根证书 / 中间级证书）

是 CA 认证机构提供，如果是双向认证则必选，否则是可选。通过 CA 证书，构成一个证书链，目的是使浏览器信任你的证书 。如果使用了 CA 证书，用它来签名服务器和客户证书，以达到浏览器信任的目的。

 [ps:会自动生成demoCA文件夹]

自己生成 CA 证书步骤：

./CA.sh –newca

回车创建新文件，输入加密密码，并填写证书信息：

Country Name (2 letter code) [AU]:CN

State or Province Name (full name) [Some-State]:Guangdong

Locality Name (eg, city) []:Shenzhen

Organization Name (eg, company) [Internet Widgits Pty Ltd]:xxx

Organizational Unit Name (eg, section) []:xxx

Common Name (eg, YOUR name) []:www.shenmiguo.com

Email Address []:xxx@xxx.com

Common Name 填入主机全称是比较好的选择。这个名称必须与通过浏览器访问您网站的 URL 完全相同，否则用户会发现您服务器证书的通用名与站点的名字不匹配，用户就会怀疑您的证书的真实性。服务器证书和客户证书的 Common Name 应该和 CA 一致。

生成结果： demoCA/private/cakey.pem 是 CA 证书的私钥文件， demoCA/cacert.pem 是 CA 证书。

这样就建好了一个 CA 服务器，有了一个根证书的私钥 cakey.pem 及一张根证书 cacert.pem, 现在就可以用 cacert.pem 来给服务器证书或客户证书签名了。

我们规范一下 CA 证书的命名，把 CA 证书和密钥重命名一下：

cp demoCA/private/cakey.pem ca.key

cp demoCA/cacert.pem ca.crt

ca.key 是中间级证书私钥， ca.crt 是中间级证书。

2.       服务器证书

a）  生成服务器私钥

openssl genrsa -des3 -out server.key 1024

 [ps:这里des3 生成的key是加密的,-des：表示生成的key是有密码保护的（注：如果是将生成的key与server的证书一起使用，最好不需要密码，就是不要这个参数，否则其它人就会在请求的时候每次都要求输入密码）]

[ps: 你可以通过如下的命令让其不需要输密码:

openssl rsa -in
server.key -out 
server.notneedpassword.key]

输入加密密码，用 128 位 rsa 算法生成密钥，得到 server.key 文件。

b）  生成服务器证书请求（ CSR ）

openssl req -new -key server.key -out server.csr

CSR （ Certificate Signing Request ）是一个证书签名请求，在申请证书之前，首先要在 WEB 服务器上生成 CSR ，并将其提交给 CA 认证中心， CA 才能给您签发 SSL 服务器证书。可以这样认为， CSR 就是一个在您服务器上生成的证书。 CSR 主要包括以下内容：

Country Name (2 letter code) [AU]:CN

State or Province Name (full name) [Some-State]:Guangdong

Locality Name (eg, city) []:Shenzhen

Organization Name (eg, company) [Internet Widgits Pty Ltd]:xxx

Organizational Unit Name (eg, section) []:xxx

Common Name (eg, YOUR name) []:shenmiguo.com

Email Address []:xxx@xxx.com

Please enter the following ‘extra’ attributes

to be sent with your certificate request

A challenge password []:

An optional company name []:

Common Name 填入主机名和 CA 一致。

c）  自己生成服务器证书

如果不使用 CA 证书签名的话，用如下方式生成：

openssl req -x509 -days 1024 -key server.key -in server.csr > server.crt

用服务器密钥和证书请求生成证书 server.crt ， -days 参数指明证书有效期，单位为天。商业上来说，服务器证书是由通过第三方机构颁发的，该证书由第三方认证机构颁发的。

如果使用 CA 证书签名，用 openssl 提供的工具 CA.sh 生成服务器证书：

mv server.csr newreq.pem

./CA.sh -sign

mv newcert.pem server.crt

签名证书后，可通过如下命令可查看服务器证书的内容：

openssl x509 -noout -text -in server.crt

可通过如下命令验证服务器证书：

openssl verify -CAfile ca.crt server.crt

3.       客户证书

客户证书是可选的。如果有客户证书，就是双向认证 HTTPS ，否则就是单向认证 HTTPS 。

a）  生成客户私钥

openssl genrsa -des3 -out client.key 1024

b）  生成客户证书签名请求

openssl req -new -key client.key -out client.csr

c）  生成客户证书（使用 CA 证书签名）

openssl ca -in client.csr -out client.crt

d）  证书转换成浏览器认识的格式

openssl pkcs12 -export -clcerts -in client.crt -inkey client.key -out client.pfx

4.       证书列表

如果使用双向认证，就会有三个私钥和三个证书。分别是 ca.key, ca.crt, server.key, server.crt, client.key, client.crt ，以及给浏览器的 client.pfx 。

如果使用有 CA 证书的单向认证，证书和私钥就是 ca.key, ca.crt, server.key, server.crt 。

如果使用无 CA 证书的单向认证，证书和私钥就是 server.key, server.crt 。

配置证书

Apache 规范的做法是将扩展的配置都配置在相应的 conf 文件中， httpd.conf 直接 Include 包含各功能配置的 conf 文件（如 php 相关配置叫 php.conf ， ssl 相关配置叫 ssl.conf ）。这样的好处是配置易于管理和变更， httpd.conf 可以依然保持简要易懂。

1.       配置 httpd.conf

<IfModule mod\_ssl.c>

Include conf/ssl.conf

</IfModule>

2.       配置 ssl.conf

主要配置包括证书路径和认证策略：

Listen 443   #https 端口

SSLRandomSeed startup builtin

SSLPassPhraseDialog builtin

SSLSessionCache dbm:logs/ssl\_scache

SSLSessionCacheTimeout 300

SSLMutex default

<VirtualHost \*:443>

ServerAdmin

DocumentRoot /usr/local/apache2/htdocs/

#DirectoryIndex digitalidCenter.htm

ServerName shenmiguo.com:443

ErrorLog logs/443-error\_log

CustomLog /usr/local/apache2/logs/ssl\_request\_log "%t %h %{SSL\_PROTOCOL}x %{SSL\_CIPHER}x \"%r\" %b"

LogLevel info

<IfModule mod\_ssl.c>

SSLEngine on

SSLCipherSuite ALL:!ADH:!EXPORT56:RC4+RSA:+HIGH:+MEDIUM:+LOW:+SSLv2:+EXP:+eNULL

SSLCertificateFile /usr/local/apache2/conf/ssl.crt/server.crt # 指定服务器证书路径

SSLCertificateKeyFile /usr/local/apache2/conf/ssl.crt/server.key # 服务器证书私钥路径

SSLCertificateChainFile /usr/local/apache2/conf/ssl.crt/ca.crt #CA 中间级证书路径

SSLCACertificatePath /usr/local/apache2/conf/ssl.crt # 客户证书目录 ( 双向认证才用 )

SSLCACertificateFile /usr/local/apache2/conf/ssl.crt/client.crt # 客户证书路径 ( 双向认证才用 )

SSLVerifyClient require # 强制客户必须持有 SSL 证书请求

SSLVerifyDepth 10

</IfModule>

</VirtualHost>

更多 mod\_ssl 配置选项说明可以见 apache 的文档：

http://lamp.linux.gov.cn/Apache/ApacheMenu/mod/mod\_ssl.html

3.       启动 Apache

cd /usr/local/apache2/bin

./apachectl startssl

可修改 apachectl 脚本，改成默认 ssl 方式启动 apache 。 apachectl 脚本中的：

start|stop|restart |graceful)

    $HTTPD -k $ARGV

    ERROR=$?

    ;;

startssl|sslstart|start-SSL)

    $HTTPD -k start -DSSL

    ERROR=$?

;;

修改为：

stop|graceful)

    $HTTPD -k $ARGV

    ERROR=$?

    ;;

restart )

    killall -9 httpd

    $HTTPD -k start -DSSL

    ;;

start |startssl|sslstart|start-SSL)

    $HTTPD -k start -DSSL

    ERROR=$?

    ;;

启动的时候需要输入 server.key 的密码。可以通过服务器私钥解密存储，重启也无需输入密码：

openssl rsa -in server.key -out my-server.key

chmod 400 server.key

ssl.conf 中的配置变更成：

SSLCertificateKeyFile /usr/local/apache2/conf/ssl.crt/my-server.key # 服务器证书解密私钥路径

FROM:http://blog.csdn.net/yuhaibao324/archive/2010/03/22/5405343.aspx
