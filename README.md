# Keeper

跨平台桌面宠物应用，内置桌宠：冰史莱姆、火史莱姆。

## 下载

安装包会在 GitHub Release 中发布：

[下载最新版 Keeper](https://github.com/204916223/Keeper/releases/latest)

如果还没有可下载文件，说明当前仓库还没有推送版本 tag。发布新版本：

```sh
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions 会自动构建 macOS、Windows、Linux 安装包并上传到 Release。

## macOS 无法打开

如果 macOS 提示 `Keeper 已损坏，无法打开`，通常是因为当前安装包还没有 Apple Developer ID 签名和公证。可以临时执行：

```sh
xattr -dr com.apple.quarantine /Applications/Keeper.app
```

然后再从 `/Applications` 打开 Keeper。

要让安装包下载后直接打开，需要在 GitHub 仓库中配置这些 Actions Secrets：

- `CSC_LINK`: Developer ID Application 证书 `.p12` 的 base64 内容
- `CSC_KEY_PASSWORD`: 证书密码
- `APPLE_ID`: Apple ID
- `APPLE_APP_SPECIFIC_PASSWORD`: App 专用密码
- `APPLE_TEAM_ID`: Apple Team ID

## 本地运行

```sh
npm install
npm start
```
