def get_hyperframes_prompt(topic: str) -> str:
    return f"""你是一个教学动画设计师。请根据用户给出的概念，生成一个 HTML 文件，
该文件将被 HyperFrames 视频引擎渲染为 MP4 视频。

概念: {topic}

HyperFrames 使用 HTML + CSS + data-attributes 定义视频片段（clips）。
每个 clip 是一个带有 class="clip" 的 div，通过 data 属性控制时序和轨道。

请生成符合以下规范的 **完整 HTML 文件**（包含 <!DOCTYPE html>、<html>、<head>、<body>）：

## 核心结构

```html
<div data-composition-id="teaching-video" data-width="1920" data-height="1080" data-fps="30" data-duration-in-frames="900">

  <!-- 背景层 (track 0) -->
  <div class="clip" data-start="0" data-duration="900" data-track-index="0"
       style="background: linear-gradient(135deg, #1a1a2e, #16213e); width: 100%; height: 100%;">
  </div>

  <!-- 标题片段 (track 1) -->
  <div class="clip" data-start="0" data-duration="90" data-track-index="1">
    <div style="...">标题内容</div>
  </div>

  <!-- 内容片段 (track 1) -->
  <div class="clip" data-start="90" data-duration="150" data-track-index="1">
    <div style="...">内容</div>
  </div>

</div>
```

## data 属性说明

- `data-composition-id`: 合成 ID（固定为 "teaching-video"）
- `data-width` / `data-height`: 视频尺寸（1920x1080）
- `data-fps`: 帧率（30）
- `data-duration-in-frames`: 总帧数 = 总秒数 × fps
- `data-start`: clip 开始帧（从 0 开始）
- `data-duration`: clip 持续帧数
- `data-track-index`: 轨道索引（0 为最底层，数字越大越靠前）

## 设计规范

1. **时序**: 总时长 30-60 秒（900-1800 帧 @30fps）
2. **轨道分层**:
   - track 0: 背景（全程）
   - track 1: 主要内容区域（文字、图表等）
   - track 2: 装饰元素、动画效果
   - track 3: 字幕/旁白文字
3. **动画**: 使用 CSS animation / transition 实现入场、退场动画
4. **配色**: 深色背景 + 浅色/亮色文字，确保可读性
5. **内容组织**:
   - 第一段: 标题 + 副标题（3秒）
   - 中间段: 知识点讲解，使用可视化元素（图表、流程图、代码等）
   - 最后段: 总结要点（3-4秒）
6. **CSS 动画** 使用 @keyframes，配合 animation-delay 实现入场效果
7. **SVG** 可用于图表、流程图等
8. **中英文双语** 内容

## 注意事项

- clip 之间不能时间重叠（同一 track 上）
- 每个 clip 内部可以有复杂的 HTML/CSS/SVG
- 不要用 JavaScript（HyperFrames 不执行 JS）
- 所有样式写在 style 属性或 <style> 标签中
- 确保文字在深色背景上清晰可读
- 生成完整的 HTML 文件，直接输出，不要用 markdown 代码块包裹"""
