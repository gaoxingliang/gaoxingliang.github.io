---
layout: post
title: "Spring or hibernate saveOrUpdateAll 偶然失效"
date: 2014-03-29 20:55:39 +0800
author: gaoxingliang
description: "最近遇到的一个问题当我们使用hibernatetemplate的saveOrUpdateAll 方法，在数据量达到一定程度时，会必然出现如下的错误：“identifier of an instance altered from X to Y”?这是很奇怪的，问题【1】该方法实现是这个样子的：public void saveOrUpdateAll(final Coll"
categories:
  - 迁移自CSDN
csdn_url: "https://blog.csdn.net/scugxl/article/details/22514707"
---

最近遇到的一个问题

当我们使用hibernatetemplate的saveOrUpdateAll 方法，在数据量达到一定程度时，会必然出现如下的错误：

## [“identifier of an instance altered from X to Y”?](http://stackoverflow.com/questions/4179166/hibernate-how-to-fix-identifier-of-an-instance-altered-from-x-to-y)

这是很奇怪的，

问题【1】该方法实现是这个样子的：

```
public void saveOrUpdateAll(final Collection entities) throws DataAccessException {
768         executeWithNativeSession(new HibernateCallback() {
769             public Object doInHibernate(Session session) throws HibernateException {
770                 checkWriteOperationAllowed(session);
771                 for (Iterator it = entities.iterator(); it.hasNext();) {
772                     session.saveOrUpdate(it.next());
773                 }
774                 return null;
775             }
776         });
777     }
```

  

如果真的是这样的话，为什么还会出现上述的错误？

从上面的方法看就是一个一个的迭代执行，而这样与自己迭代执行有什么区别？ 为什么这个会报错？

问题【2】经测试，单独一次提交1000，提交多次 是不会出现该问题得。这是问什么？

性能方面1w条-》152s 确实较慢 后面试一下直接使用jdbc卡看需要多久。

TO BE CONTINUED .....[代码随后附上]

https://github.com/gaoxingliang/algintroduction/tree/master/src/hibernate

update：hibernate4 兼容性有点问题，没有找到updateAll方法，可能正如下面的链接中说说的可能已经删除了。

下面这些链接会有帮助：

http://stackoverflow.com/questions/4179166/hibernate-how-to-fix-identifier-of-an-instance-altered-from-x-to-y

http://forum.spring.io/forum/spring-projects/data/56941-problem-with-saveorupdateall-method  这里说了如何替代该方法，就是在迭代器中单独调用saveOrUpdate

http://forum.spring.io/forum/spring-projects/data/113874-hibernatetemplate-saveorupdateall-collection-entities-performance 这里描述它的性能，2000/15s 与实际一致。

http://grepcode.com/file/repo1.maven.org/maven2/org.springframework/spring-orm/2.5.6/org/springframework/orm/hibernate3/HibernateTemplate.java#767

PS:

从这里下载打好的spring zip包：http://maven.springframework.org/release/org/springframework/spring/3.2.4.RELEASE/

hibernate3：http://sourceforge.net/projects/hibernate/files/hibernate3/3.5.0-Final/hibernate-distribution-3.5.0-Final-dist.zip/download?use\_mirror=nchc
