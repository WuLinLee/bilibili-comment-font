# Bilibili 评论区字体大小调节

一个用于调节哔哩哔哩评论区文字大小的用户脚本，支持新版评论组件和部分旧版评论区样式。

## 功能

- **自由调整字号：** 默认 14px，可在 10px–40px 之间以 1px 为步长调节。
- **悬浮控制面板：** 在页面右下角显示字体调节按钮。点击展开后，可以通过减号、加号或滑块调整字号。
- **拖动与收起：** 面板可以拖到页面其他位置，也可以收起为小图标，减少对阅读的遮挡。
- **记住字号：** 调整结果会通过用户脚本管理器的存储功能保存，打开其他匹配页面时继续使用。
- **键盘快捷键：** 在没有聚焦输入框时使用快捷键调节字号。
- **动态评论适配：** 处理评论区动态加载的内容、回复及相关编辑框。

## 支持页面

脚本匹配以下哔哩哔哩页面：

- 视频：www.bilibili.com/video/
- 番剧：www.bilibili.com/bangumi/
- 专栏：www.bilibili.com/read/
- 动态/图文：www.bilibili.com/opus/、t.bilibili.com/
- 个人空间：space.bilibili.com/
- 视频列表：www.bilibili.com/list/

实际效果可能因哔哩哔哩页面结构更新而变化。

## 安装

### 一键安装

1. 先在浏览器中安装用户脚本管理器，例如 [Tampermonkey（篡改猴）](https://www.tampermonkey.net/)。
2. 打开下方脚本原始地址。
3. 在用户脚本管理器的安装页面中确认安装。

**脚本安装地址：**  
[点击安装 Bilibili 评论区字体大小调节](https://raw.githubusercontent.com/WuLinLee/bilibili-comment-font/main/bilibili-comment-font.user.js)

### 手动安装

也可以在用户脚本管理器中新建脚本，将仓库里的 [bilibili-comment-font.user.js](https://github.com/WuLinLee/bilibili-comment-font/blob/main/bilibili-comment-font.user.js) 内容复制进去并保存。

## 使用方法

1. 打开任意一个受支持的哔哩哔哩页面。
2. 找到页面右下角的「🔤」悬浮图标，点击展开控制面板。
3. 使用「−」或「+」按钮，或拖动滑块调整评论字号。
4. 点击「默认」恢复到 14px；点击「收起」隐藏控制面板。
5. 按住面板标题栏或收起后的图标，可将面板拖动到合适的位置。

### 快捷键

| 操作 | 快捷键 |
| --- | --- |
| 放大字号 | Ctrl + Alt + ↑，或 Ctrl + Alt + = / + |
| 缩小字号 | Ctrl + Alt + ↓，或 Ctrl + Alt + - |
| 恢复默认字号（14px） | Ctrl + Alt + 0 |

当焦点位于输入框、文本框或可编辑区域时，脚本不会拦截这些快捷键。

## 设置范围

- 默认字号：14px
- 最小字号：10px
- 最大字号：40px
- 调节步长：1px

字号设置由用户脚本管理器保存。清除该脚本的存储数据后，设置可能恢复为默认值。

## 常见问题

**看不到悬浮图标？**  
请确认用户脚本管理器已启用、脚本已安装，并刷新匹配的哔哩哔哩页面。

**部分评论文字没有变化？**  
哔哩哔哩可能会更新页面组件或样式结构。当前脚本针对常见的新旧评论元素进行处理，但无法保证覆盖网站未来的所有改版。

**快捷键没有反应？**  
请先让页面获得焦点，并确认没有正在输入文字；也可以直接使用悬浮面板调节。

## 许可证

本项目采用 MIT License。详见仓库中的 [LICENSE](https://github.com/WuLinLee/bilibili-comment-font/blob/main/LICENSE)。

## 项目地址

- 仓库：[WuLinLee/bilibili-comment-font](https://github.com/WuLinLee/bilibili-comment-font)
- 原始脚本：[bilibili-comment-font.user.js](https://raw.githubusercontent.com/WuLinLee/bilibili-comment-font/main/bilibili-comment-font.user.js)
