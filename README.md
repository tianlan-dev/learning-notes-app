# Learning Notes App

基于 VitePress 的学习笔记站点。笔记正文和资源文件不直接放在仓库里。运行前需要在仓库根目录提供一个本地 `learning-notes/` 笔记源目录，或者创建一个名为 `learning-notes` 的符号链接指向真实笔记目录。

## 运行

首次运行先安装依赖：

```sh
npm install
```

本地启动配置放在两个 Git 忽略的环境文件里：

- `.env.production.local`: production Docker 启动配置。
- `.env.development.local`: local development 启动配置。

两个文件都需要定义 `APP_HOST` 和 `APP_PORT`。

### Production in Docker

先创建本地 production 环境文件。这个文件会被 Git 忽略：

```sh
cat > .env.production.local <<'EOF'
APP_HOST=0.0.0.0
APP_PORT=<production-port>
EOF
```

然后用 Docker 构建并启动 production container：

```sh
./production-docker.sh
```

production Docker build 会使用 `learning-notes` 作为笔记源 build context。

### Local Development

先创建本地 development 环境文件。这个文件会被 Git 忽略：

```sh
cat > .env.development.local <<'EOF'
APP_HOST=0.0.0.0
APP_PORT=<local-dev-port>
EOF
```

```sh
./development-server.sh
```

development 启动脚本会读取 `.env.development.local`，停止占用同一端口的旧进程，执行 `npm run build`，然后在后台运行 `npm run start`。具体监听地址和端口由本地环境文件提供。

## Package scripts

```sh
npm run build
npm run start
```

- `npm run build`: 读取 `learning-notes/` 笔记源目录，把 Markdown 准备到 `.vitepress-src/`，并连接资源目录。Docker image 构建和 development 启动脚本都会调用它。
- `npm run start`: 启动 VitePress 服务。需要通过环境变量提供 `APP_PORT`，可选提供 `APP_HOST`。

## Startup scripts

- `./production-docker.sh [start|stop|restart]`: 读取 `.env.production.local`，使用 `learning-notes` 作为 Docker build context，构建 image，并替换同名 production container。
- `./development-server.sh [start|stop|restart]`: 读取 `.env.development.local`，停止占用 development 端口的旧进程，执行 `npm run build`，然后在后台运行 `npm run start`。

脚本日志写入 `.server-logs/`，该目录不会提交到 Git。

## 目录约定

- `learning-notes/`: 本地笔记源目录，或者指向实际笔记目录的符号链接。
- `learning-notes/_resources/`: 图片等静态资源目录。
- `.vitepress/scripts/prepare-source.mjs`: 构建前准备脚本，会把笔记目录中的 Markdown 复制到 `.vitepress-src/`。
- `.vitepress-src/`: 自动生成的 VitePress 源目录，不需要提交。

准备脚本会把 `README.md` 转成 `index.md`，并把 `learning-notes/_resources` 链接到 `.vitepress-src/public/_resources`。

## 笔记源目录

如果笔记就放在这个仓库目录里，可以创建普通目录：

```sh
mkdir learning-notes
```

如果笔记存放在其他位置，可以创建 `learning-notes` 符号链接：

```sh
ln -s /path/to/learning-notes learning-notes
```

`learning-notes` 需要包含笔记 Markdown 文件，以及可选的 `_resources` 资源目录。
