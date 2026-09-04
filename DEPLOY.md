# 部署指南

## 首次部署

### 1. 拉代码

```bash
git clone https://github.com/Bill-englab/EnglishGameDemo.git
cd EnglishGameDemo
```

### 2. 安装 Python 依赖

```bash
cd app
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt   # Windows
# Linux:  .venv/bin/python -m pip install -r requirements.txt
```

### 3. 创建配置文件（不入仓库）

```bash
cp config.example.json config.json
```

编辑 `app/config.json`，改管理员密码和 secret key：

```json
{
  "admin_password": "你的密码",
  "secret_key": "至少32字符的随机值"
}
```

可以用 Python 生成 64 字符随机 secret，再复制到上面：

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

示例文件里的 `CHANGE_ME` 不能直接使用；应用会拒绝默认密码、占位值、过短 secret 或损坏的 JSON，并在启动时明确报错。本机没有 `config.json` 时仍可用 `admin` / `admin123` 开发，但 session secret 每次启动都会重新生成，因此这种模式不能用于部署。

### 4. 上传视频（用 Xftp / scp / FTP）

把本地的视频文件传到对应目录：

- `demo/04/01-choosing-requests/01-request-an-item/demo.mp4` → 传到服务器的相同路径
- `recordings/` 下已有用户上传的，不用管

**目录结构对照**：本地和服务器完全一致，直接拖文件夹就行。

### 5. 启动

```bash
cd app
.venv/Scripts/python app.py          # Windows
# Linux:  .venv/bin/python app.py
```

打开 `http://服务器IP:5000`，用 `admin` / 你设的密码登录。

---

## 日常更新（代码更新后）

### 1. 拉代码

```bash
cd EnglishGameDemo
git pull
```

**这不影响视频文件**——`demo/`、`recordings/`、`config.json`、`users.json` 都被 gitignore 排除，`git pull` 只更新代码和文案（`app/`、`curriculum/`、归档 `content/`、`prompts/` 等）。

### 2. 如果有新的 demo 视频

用 Xftp 把新的 `demo.mp4` 拖到对应目录即可。不用重启服务器（Flask 读文件是实时的，刷新页面就能看到）。

### 3. 如果改了 Python 代码

需要重启服务器：`Ctrl+C` 停掉，再 `python app.py`。

---

## 安全要点

- `app/config.json` 包含管理员密码——**不要上传到 GitHub**（已被 gitignore）
- `app/users.json` 包含用户密码哈希——**不要上传到 GitHub**（已被 gitignore）
- `demo/` 和 `recordings/` 下的所有视频——**不要上传到 GitHub**（已被 gitignore）
- 部署必须创建有效的 `config.json`；不要使用 `admin123`、`CHANGE_ME` 或固定示例 secret
- 公网部署建议加 Nginx 反向代理 + HTTPS

---

## 目录说明（什么该传、什么不该传）

| 目录 | git pull 会更新 | Xftp 上传 | 说明 |
| --- | --- | --- | --- |
| `app/` | ✅ 代码 | ❌ | Flask 应用代码 |
| `curriculum/` | ✅ 文案 | ❌ | 新版分年龄课程唯一创作源 |
| `content/` | ✅ 归档 | ❌ | v1 meta.json + dialogues.md，仅兼容参考 |
| `prompts/` | ✅ 提示词 | ❌ | 新版 `04/.../{a,b,c}.txt` 与 v1 历史文本 |
| `demo/` | 只更新 README | ✅ 视频 | demo 视频（手动传） |
| `recordings/` | 只更新 README | ❌ | 用户自己上传，不用管 |
| `app/config.json` | ❌ 不更新 | 手动创建 | 服务器专用配置 |
| `app/users.json` | ❌ 不更新 | ❌ | 网页管理自动生成 |
