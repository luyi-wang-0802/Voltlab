# FusionLab WS2025 Group 8

[Jump to Chinese](#中文版)

<video width="100%" controls>
  <source src="https://github.com/luyi-wang-0802/Voltlab/releases/download/demo-video/FL2025_Group08_WebApp_Demo.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

## English

### Project Overview

FusionLab is a full-stack innovation center explorer and booking platform. The project combines an interactive 3D frontend with a FastAPI backend to support room exploration, event discovery, navigation, and room or seat booking workflows.

### Repository Structure

```text
.
|-- assets/                  # Demo assets used by the root documentation
|-- fusionlab-frontend/      # React + TypeScript + Three.js frontend
|-- fusionlab-backend/       # FastAPI + SQLAlchemy backend
|-- package.json
`-- README.md
```

### Subproject Documentation

- [Frontend README](./fusionlab-frontend/README.md)
- [Backend README](./fusionlab-backend/readme.md)

### Tech Stack

Frontend:
- React
- TypeScript
- Vite
- Three.js
- GSAP

Backend:
- FastAPI
- SQLAlchemy
- Alembic
- SQLite
- Pydantic

### Main Features

- Interactive 3D building exploration
- Storytelling and walkthrough experiences
- Room 360 views
- Event discovery and filtering
- Room and seat booking workflows
- User session and profile management
- Poster upload and static asset serving

### Quick Start

Start the backend:

```bash
cd fusionlab-backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend default URL: `http://127.0.0.1:8000`

Start the frontend:

```bash
cd fusionlab-frontend
npm install
npm run dev
```

Frontend default URL: `http://localhost:3000`

For detailed setup and architecture:

1. Read the [Frontend README](./fusionlab-frontend/README.md).
2. Read the [Backend README](./fusionlab-backend/readme.md).

### Notes

- The demo video is embedded above and can be played directly in the README.
- Video source: GitHub Releases

## 中文版

### 项目简介

FusionLab 是一个面向创新中心场景的全栈探索与预约平台。项目将交互式 3D 前端与 FastAPI 后端结合，用于支持空间探索、活动发现、室内导航，以及房间和座位预约等功能。

### 仓库结构

```text
.
|-- assets/                  # 根目录文档使用的演示资源
|-- fusionlab-frontend/      # React + TypeScript + Three.js 前端
|-- fusionlab-backend/       # FastAPI + SQLAlchemy 后端
|-- package.json
`-- README.md
```

### 子项目文档

- [前端 README](./fusionlab-frontend/README.md)
- [后端 README](./fusionlab-backend/readme.md)

### 技术栈

前端：
- React
- TypeScript
- Vite
- Three.js
- GSAP

后端：
- FastAPI
- SQLAlchemy
- Alembic
- SQLite
- Pydantic

### 主要功能

- 交互式 3D 建筑探索
- 叙事式浏览与导览体验
- 房间 360 度全景展示
- 活动发现与筛选
- 房间和座位预约流程
- 用户会话与个人资料管理
- 海报上传与静态资源服务

### 快速开始

启动后端：

```bash
cd fusionlab-backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

后端默认地址：`http://127.0.0.1:8000`

启动前端：

```bash
cd fusionlab-frontend
npm install
npm run dev
```

前端默认地址：`http://localhost:3000`

如需查看更详细的配置、架构和接口说明：

1. 阅读 [前端 README](./fusionlab-frontend/README.md)。
2. 阅读 [后端 README](./fusionlab-backend/readme.md)。

### 说明

- 内嵌视频使用本地文件 `assets/VideoCompress-FL2025_Group08_WebApp_Demo.mp4.mp4`。
- 如果当前页面无法直接播放，请使用上方的视频直链。
