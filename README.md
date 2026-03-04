# gaoxingliang.github.io

技术博客，基于 Jekyll + GitHub Pages。

## 本地运行

### Windows

1. **安装 Ruby**
   - 从 [RubyInstaller](https://rubyinstaller.org/downloads/) 下载 **Ruby+Devkit** 版本（推荐 3.2 或 3.3）
   - 安装时勾选「Add Ruby to PATH」
   - 安装完成后，在最后一步运行 `ridk install`，选择 **3** 安装 MSYS2 和 MINGW 工具链

2. **打开新的 PowerShell 或 CMD**，进入项目目录：

   ```powershell
   cd D:\forked\githubdocs
   ```

3. **配置国内镜像**（若 `bundle install` 超时）：

   ```powershell
   # China 镜像
   bundle config set --global mirror.https://rubygems.org https://gems.ruby-china.com
   ```

4. **安装依赖并启动**：

   ```powershell
   bundle install
   bundle exec jekyll serve
   ```

5. 浏览器访问 http://localhost:4000

> 若 `bundle` 命令不存在，可先执行：`gem install bundler`

### macOS / Linux

```bash
bundle install
bundle exec jekyll serve
```

## 部署

推送到 GitHub 后，GitHub Pages 会自动构建并发布。


## 目录结构

- `_posts/` - 博客文章（Markdown）
- `_layouts/` - 页面模板
- `assets/css/` - 样式文件

