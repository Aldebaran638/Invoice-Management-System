# Invoice Management System

这是当前项目的根目录启动说明。

## 一句话结论

- 只想把项目跑起来：执行 `docker compose watch`
- 要参与开发：先执行 `.\bootstrap-dev.ps1`，再执行 `docker compose watch`

## 1. 运行项目

第一次克隆项目后，进入项目根目录，执行：

```powershell
docker compose watch
```

启动完成后可访问：

- 前端：`http://localhost:5173`
- 后端：`http://localhost:8000`
- Swagger：`http://localhost:8000/docs`
- Adminer：`http://localhost:8080`
- MailCatcher：`http://localhost:1080`
- Traefik UI：`http://localhost:8090`

## 2. 开发者初始化

如果你要参与开发，不要手动乱装环境，直接在项目根目录执行：

```powershell
.\bootstrap-dev.ps1
```

执行前需要先满足以下条件：

- 已安装 `Python 3.11`
- 已安装 `Node.js` 与 `npm`
- 已安装 `Docker Desktop`

说明：

- 后端开发环境固定使用 `Python 3.11`
- `bootstrap-dev.ps1` 会使用本机 Python 创建 `backend/.venv`
- 如果你只是运行项目，不需要本机安装 Python，直接执行 `docker compose watch`

这个脚本会自动完成：

- 创建或复用 `backend/.venv`
- 安装后端依赖到 `backend/.venv`
- 更新 `backend/requirements.txt`
- 安装前端依赖
- 安装 Playwright 的 `chromium`

## 3. 开发时的固定规则

- 后端虚拟环境唯一合法位置：`backend/.venv`
- 项目运行统一使用：`docker compose watch`
- 前端页面测试统一使用 Playwright
- 后端接口测试统一使用后端测试命令或测试文档中的 `curl`

## 4. 常用命令

启动项目：

```powershell
docker compose watch
```

初始化开发环境：

```powershell
.\bootstrap-dev.ps1
```

运行前端构建：

```powershell
npm --prefix frontend run build
```

运行前端 Playwright 测试：

```powershell
cd frontend
npx playwright test --reporter=line
```

运行后端测试：

```powershell
backend\.venv\Scripts\python.exe -m pytest
```

## 5. 目录说明

- `frontend/`：前端代码
- `backend/`：后端代码
- `docs/`：设计文档与测试文档
- `skills/`：架构师、前端、后端、测试 AI 的工作规范
- `bootstrap-dev.ps1`：开发者初始化脚本

## 6. 说明

- 如果只是使用项目，不需要手动创建后端虚拟环境。
- 如果只是运行项目，不需要手动安装 Playwright 浏览器。
- 只有参与开发和测试时，才需要执行 `.\bootstrap-dev.ps1`。
