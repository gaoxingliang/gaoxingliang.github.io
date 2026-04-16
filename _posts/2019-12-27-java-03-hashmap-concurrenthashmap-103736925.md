---
layout: post
title: "Java拾遗03- 各个时期的HashMap和ConcurrentHashMap"
date: 2019-12-27 22:16:12 +0800
author: gaoxingliang
description: "引子最近在看小灰灰算法.里面有一节讲到散列表相关的比较有意思. 本文记录散列表相关, 以及JDK中的hashmap concurrenthashmap 是如何优化的.书中所说解决散列表冲突时候的2种办法:开放寻址法如下图, 我们想放入Entry6  (hash后需要放的位置是3)但是位置3上面已经有Entry5, 那么我们会**向数组后面接着找下一个有空的位置**. 这就是开放寻址..."
categories:
  - 迁移自CSDN
csdn_url: "https://blog.csdn.net/scugxl/article/details/103736925"
---

## 引子

最近在看小灰灰算法.里面有一节讲到散列表相关的比较有意思. 本文记录散列表相关, 以及JDK中的hashmap concurrenthashmap 是如何优化的.更多[拾遗系列文章](https://blog.csdn.net/scugxl/article/details/103736866)

## 书中所说

### 解决散列表冲突时候的2种办法:

1. 开放寻址法  
    如下图, 我们想放入Entry6 (hash后需要放的位置是3)  
    ![在这里插入图片描述]({{ '/assets/images/posts/java-03-hashmap-concurrenthashmap-103736925/img-001.png' | relative_url }})  
    但是位置3上面已经有Entry5, 那么我们会\*\*向数组后面接着找下一个有空的位置\*\*. 这就是开放寻址法.

比如上个例子中我们会把entry6 放到位置4上:  
 ![在这里插入图片描述]({{ '/assets/images/posts/java-03-hashmap-concurrenthashmap-103736925/img-002.png' | relative_url }})**TIPS:**  
 ThreadLocal使用的是开放寻址法

(内心戏, 原来这些东西离我们真的不远, 查看ThreadLocal实现):

```
        private void set(ThreadLocal<?> key, Object value) {

            // We don't use a fast path as with get() because it is at
            // least as common to use set() to create new entries as
            // it is to replace existing ones, in which case, a fast
            // path would fail more often than not.

            Entry[] tab = table;
            int len = tab.length;
            int i = key.threadLocalHashCode & (len-1);

            for (Entry e = tab[i];   // line 1
                 e != null;
                 e = tab[i = nextIndex(i, len)]) {  // line2
                ThreadLocal<?> k = e.get();

                if (k == key) {  // line 3
                    e.value = value;
                    return;
                }

                if (k == null) {  // line4
                    replaceStaleEntry(key, value, i);
                    return;
                }
            }

            tab[i] = new Entry(key, value);
            int sz = ++size;
            if (!cleanSomeSlots(i, sz) && sz >= threshold)
                rehash();

// 分析:
/**
* line1: 初始化为第一个要找的位置
* line2: for循环的下一个位置
* line3: 如果是当前key则设置值.
* line4: 如果当前的位置没有数据则放到当前位置.
* 问题的关键就是nextIndex方法:
***/
        private static int nextIndex(int i, int len) {
            return ((i + 1 < len) ? i + 1 : 0);
        }
这就是当前位置的下一个位置(超出则回到0号位置.)
```

2. 链表法  
    链表法就是当发生冲突时, 我们会把发生冲突的元素链接到前一个元素的后面:  
    (像下面这样在位置2便形成了一个链表)  
    ![在这里插入图片描述]({{ '/assets/images/posts/java-03-hashmap-concurrenthashmap-103736925/img-003.png' | relative_url }})

## JDK的实现分析

[这里面](https://blog.csdn.net/scugxl/article/details/103058085)提到了一些. 有兴趣的可以看看HashMap的死锁问题解决. 这里主要介绍下jdk1.7/jdk8中的hashmap和concurrenthashmap的实现的一些小细节和改动

### JDK 1.7的hashmap

完整的链表实现. 但是如果冲突严重(某个位置的链表的长度很长很长)的时候,会导致查询效率下降(O(N)的复杂度了).

```
jdk7的put方法:
    public V put(K key, V value) {
        if (table == EMPTY_TABLE) {
            inflateTable(threshold);
        }
        if (key == null)
            return putForNullKey(value); // 从这里可以看出是支持NULL key的
        int hash = hash(key);
        int i = indexFor(hash, table.length);  // 计算当前要插入key所在的位置
        for (Entry<K,V> e = table[i]; e != null; e = e.next) {  // 遍历当前位置i上的所有元素
            Object k;
            if (e.hash == hash && ((k = e.key) == key || key.equals(k))) {
                V oldValue = e.value; // 如果有key相同的,  就更新他的值
                e.value = value;
                e.recordAccess(this);
                return oldValue;
            }
        }

        modCount++;
        addEntry(hash, key, value, i);  // 如果没有就添加一个新的元素在指定位置

// addEntry实现:
    void addEntry(int hash, K key, V value, int bucketIndex) {
        if ((size >= threshold) && (null != table[bucketIndex])) {
            resize(2 * table.length); // 如果需要resize的话
            hash = (null != key) ? hash(key) : 0;
            bucketIndex = indexFor(hash, table.length);
        }
      // 直接加一个entry放到index就可以了
        createEntry(hash, key, value, bucketIndex);
    }

    void createEntry(int hash, K key, V value, int bucketIndex) {
        Entry<K,V> e = table[bucketIndex];
        table[bucketIndex] = new Entry<>(hash, key, value, e);
        size++;
    }
```

### JDK 8的hashmap

为了解决这个问题, 在JDK8中当链表长度达到一定长度后(默认是8), **会将链表转化为一颗红黑树.** 这是一个很大的不同.

```
final V putVal(int hash, K key, V value, boolean onlyIfAbsent,
                   boolean evict) {
        Node<K,V>[] tab; Node<K,V> p; int n, i;
        if ((tab = table) == null || (n = tab.length) == 0)
            n = (tab = resize()).length;
        if ((p = tab[i = (n - 1) & hash]) == null)
            tab[i] = newNode(hash, key, value, null); // 初始化 如果该位置还没东西的时候
        else {
            Node<K,V> e; K k;
            if (p.hash == hash &&
                ((k = p.key) == key || (key != null && key.equals(k))))
                e = p; // 找到了一个相等的节点
            else if (p instanceof TreeNode)
                e = ((TreeNode<K,V>)p).putTreeVal(this, tab, hash, key, value);
                // 如果该节点已经变成一棵树了的话 调用树的putTreeVal方法
            else {
            // 否则, 这时候数组里面的元素还是链表形式
                for (int binCount = 0; ; ++binCount) {
                    if ((e = p.next) == null) {
                        p.next = newNode(hash, key, value, null);
                        if (binCount >= TREEIFY_THRESHOLD - 1) // -1 for 1st
                            treeifyBin(tab, hash);  // 如果插入后的元素 超过了阈值就切换为一棵树
                        break;
                    }
                    if (e.hash == hash &&
                        ((k = e.key) == key || (key != null && key.equals(k))))
                        break;
                    p = e;
                }
            }
            if (e != null) { // existing mapping for key
                V oldValue = e.value;
                if (!onlyIfAbsent || oldValue == null)
                    e.value = value;
                afterNodeAccess(e);
                return oldValue;
            }
        }
        ++modCount;
        if (++size > threshold)
            resize();
        afterNodeInsertion(evict);
        return null;
    }

// 将某个index的链表的所有元素 切换为红黑树
    /**
     * Replaces all linked nodes in bin at index for given hash unless
     * table is too small, in which case resizes instead.
     */
    final void treeifyBin(Node<K,V>[] tab, int hash) {
        int n, index; Node<K,V> e;
        if (tab == null || (n = tab.length) < MIN_TREEIFY_CAPACITY)
            resize();
        else if ((e = tab[index = (n - 1) & hash]) != null) {
            TreeNode<K,V> hd = null, tl = null;
            do {
                TreeNode<K,V> p = replacementTreeNode(e, null);
                if (tl == null)
                    hd = p;
                else {
                    p.prev = tl;
                    tl.next = p;
                }
                tl = p;
            } while ((e = e.next) != null);
            if ((tab[index] = hd) != null)
                hd.treeify(tab);
        }
    }

// TreeNode的定义:
    static final class TreeNode<K,V> extends LinkedHashMap.Entry<K,V> {
        TreeNode<K,V> parent;  // red-black tree links
        TreeNode<K,V> left;
        TreeNode<K,V> right;
        TreeNode<K,V> prev;    // needed to unlink next upon deletion
        boolean red;  // 很明显这就是颗红黑树啦.
```

### JDK 1.7的ConcurrentHashMap

JDK1.7中的CHM是以Segment为同步单位的. 一个Segement可以保护多个Key(实际上可以理解为是一个小的hashmap). Segement本身继承自ReentrantLock

```
    final Segment<K,V>[] segments;  // chm中的segement数组定义
    static final class Segment<K,V> extends ReentrantLock implements Serializable
```

put时:

```
    public V put(K key, V value) {
        Segment<K,V> s;
        if (value == null)
            throw new NullPointerException();
        int hash = hash(key);
        int j = (hash >>> segmentShift) & segmentMask;
        if ((s = (Segment<K,V>)UNSAFE.getObject          // nonvolatile; recheck
             (segments, (j << SSHIFT) + SBASE)) == null) //  in ensureSegment
            s = ensureSegment(j);
            // 第一步找到segement
        return s.put(key, hash, value, false); // 第二步将元素加入到这个segement

// segement.put 实现
HashEntry<K,V> node = tryLock() ? null :
                scanAndLockForPut(key, hash, value);  // 先获取锁  也就是调用自身的lock方法
            V oldValue;
            try {
            // 跟hashmap类似的put操作
                HashEntry<K,V>[] tab = table;
                int index = (tab.length - 1) & hash;
                HashEntry<K,V> first = entryAt(tab, index);
                for (HashEntry<K,V> e = first;;) {
                    if (e != null) {
                        K k;
                        if ((k = e.key) == key ||
                            (e.hash == hash && key.equals(k))) {
                            oldValue = e.value;
                            if (!onlyIfAbsent) {
                                e.value = value;
                                ++modCount;
                            }
                            break;
                        }
                        e = e.next;
                    }
                    else {
                        if (node != null)
                            node.setNext(first);
                        else
                            node = new HashEntry<K,V>(hash, key, value, first);
                        int c = count + 1;
                        if (c > threshold && tab.length < MAXIMUM_CAPACITY)
                            rehash(node);
                        else
                            setEntryAt(tab, index, node);
                        ++modCount;
                        count = c;
                        oldValue = null;
                        break;
                    }
                }
            } finally {
            // 最后解锁
                unlock();
            }
```

get时:

```
 Segment<K,V> s; // manually integrate access methods to reduce overhead
        HashEntry<K,V>[] tab;
        int h = hash(key);
        // 这里调用了cas相关的getvolatile相关方法来保证可见性
        long u = (((h >>> segmentShift) & segmentMask) << SSHIFT) + SBASE;
        if ((s = (Segment<K,V>)UNSAFE.getObjectVolatile(segments, u)) != null &&
            (tab = s.table) != null) {
            for (HashEntry<K,V> e = (HashEntry<K,V>) UNSAFE.getObjectVolatile
                     (tab, ((long)(((tab.length - 1) & h)) << TSHIFT) + TBASE);
                 e != null; e = e.next) {
                K k;
                if ((k = e.key) == key || (e.hash == h && key.equals(k)))
                    return e.value;
            }
        }
        return null;
```

### JDK8的ConcurrentHashMap

在jdk8中, 做了一项很重要的改进就是, 缩小了锁的同步粒度从而提高了并发能力. 结构也发生了变化.  
 新的chm中的主要结构不是segements, 而是跟hashmap里面一样的就是node数组:

```
transient volatile Node<K,V>[] table;
```

然后有很多特殊类型的node:  
 ![在这里插入图片描述]({{ '/assets/images/posts/java-03-hashmap-concurrenthashmap-103736925/img-004.png' | relative_url }})比如`ForwardingNode`是用来resize的时候跟踪被resize的节点的. `ReservationNode`是用来检测`compute`或者`computeIfAbsent`的时候的递归调用的. `TreeBin`用来维护table中的首节点(不维护真实的key,value). `TreeNode`维护真实数据的树形结构的节点. (是的hashmap中的红黑树在chm中也有保留).  
 put时:

```
    final V putVal(K key, V value, boolean onlyIfAbsent) {
        if (key == null || value == null) throw new NullPointerException();
        int hash = spread(key.hashCode()); // 找到hashcode, 这里有重hash可以防止用户生成的hashcode冲突太多
        int binCount = 0;
        for (Node<K,V>[] tab = table;;) { // 跟hashmap类似的遍历table中的每个首节点
            Node<K,V> f; int n, i, fh;
            if (tab == null || (n = tab.length) == 0)
                tab = initTable();  // 延迟初始化的  先检查一下
            else if ((f = tabAt(tab, i = (n - 1) & hash)) == null) {
                if (casTabAt(tab, i, null,
                             new Node<K,V>(hash, key, value, null)))
                    break;                   // no lock when adding to empty bin
            }
            else if ((fh = f.hash) == MOVED)
                tab = helpTransfer(tab, f); // 如果是正在transfer就调用forwardingnode相关逻辑
            else {
                V oldVal = null;
                synchronized (f) { // 同步加锁了.  此时f只是table中的一个节点    可以想象只有hash出来的node是同一个的时候才会有冲突.   
                    if (tabAt(tab, i) == f) {
                        if (fh >= 0) {
                            binCount = 1;
                            for (Node<K,V> e = f;; ++binCount) {
                                K ek;
                                if (e.hash == hash &&
                                    ((ek = e.key) == key ||
                                     (ek != null && key.equals(ek)))) {
                                    oldVal = e.val;
                                    if (!onlyIfAbsent)
                                        e.val = value;
                                    break;
                                }
                                Node<K,V> pred = e;
                                if ((e = e.next) == null) {
                                    pred.next = new Node<K,V>(hash, key,
                                                              value, null);
                                    break;
                                }
                            }
                        }
                        else if (f instanceof TreeBin) {
                            Node<K,V> p;
                            binCount = 2;
                            if ((p = ((TreeBin<K,V>)f).putTreeVal(hash, key,
                                                           value)) != null) {
                                oldVal = p.val;
                                if (!onlyIfAbsent)
                                    p.val = value;
                            }
                        }
                    }
                }
                if (binCount != 0) {
                    if (binCount >= TREEIFY_THRESHOLD)
                        treeifyBin(tab, i); // 也会做红黑树转换.
                    if (oldVal != null)
                        return oldVal;
                    break;
                }
            }
        }
        addCount(1L, binCount);
        return null;
```

get时:

```
    public V get(Object key) {
        Node<K,V>[] tab; Node<K,V> e, p; int n, eh; K ek;
        int h = spread(key.hashCode()); // 计算hash   
        if ((tab = table) != null && (n = tab.length) > 0 &&
            (e = tabAt(tab, (n - 1) & h)) != null) {
            if ((eh = e.hash) == h) {
                if ((ek = e.key) == key || (ek != null && key.equals(ek)))
                    return e.val;
            }
            else if (eh < 0) // 正在transfer的节点
                return (p = e.find(h, key)) != null ? p.val : null;
            while ((e = e.next) != null) {
                if (e.hash == h &&
                    ((ek = e.key) == key || (ek != null && key.equals(ek))))
                    return e.val;
            }
        }
        return null;
    }
```
