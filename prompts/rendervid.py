def get_rendervid_prompt(topic: str) -> str:
    return f"""你是一个教学动画场景设计师。请根据用户给出的概念，生成一个 RenderVid JSON 模板。
该 JSON 将被 RenderVid 视频引擎渲染为 MP4 视频。

概念: {topic}

请严格按照 RenderVid 的 JSON schema 输出，不要输出任何其他内容，不要用 markdown 代码块包裹：

{{
  "width": 1920,
  "height": 1080,
  "fps": 30,
  "scenes": [
    {{
      "duration": 3,
      "layers": [...]
    }}
  ]
}}

## Scene 结构

每个 scene 包含:
- `duration`: 场景时长（秒）
- `transition`: 可选，场景过渡效果
  - `type`: "fade" | "slideLeft" | "slideRight" | "slideUp" | "slideDown" | "wipe"
  - `duration`: 过渡时长（秒，默认 0.5）
- `layers`: 图层数组（后面的图层渲染在上层）

## Layer 类型

### 1. text - 文字图层
{{
  "type": "text",
  "text": "标题文字",
  "x": 960, "y": 200,
  "fontSize": 72,
  "fontFamily": "Inter, sans-serif",
  "color": "#FFFFFF",
  "fontWeight": "bold",
  "textAlign": "center",
  "maxWidth": 1600,
  "animation": {{...}}
}}

### 2. shape - 形状图层
{{
  "type": "shape",
  "shape": "rectangle",
  "x": 100, "y": 100,
  "width": 400, "height": 300,
  "fill": "#FF6B6B",
  "borderRadius": 16,
  "opacity": 0.9,
  "animation": {{...}}
}}
shape 可选: "rectangle", "circle", "ellipse", "line"

### 3. image - 图片图层
{{
  "type": "image",
  "src": "https://example.com/image.png",
  "x": 100, "y": 100,
  "width": 400, "height": 300,
  "animation": {{...}}
}}

### 4. group - 分组图层（将多个图层组合）
{{
  "type": "group",
  "x": 0, "y": 0,
  "layers": [
    {{ "type": "shape", ... }},
    {{ "type": "text", ... }}
  ],
  "animation": {{...}}
}}

## 动画 (Animation)

每个图层可以有 animation 属性：
{{
  "animation": {{
    "type": "fadeIn",
    "delay": 0.5,
    "duration": 0.8,
    "easing": "easeOut"
  }}
}}

可用动画类型：
- 入场: "fadeIn", "slideInLeft", "slideInRight", "slideInUp", "slideInDown", "scaleIn", "bounceIn"
- 退场: "fadeOut", "slideOutLeft", "slideOutRight", "scaleOut"
- 持续: "pulse", "float", "typewriter"（仅 text 层）

easing 可选: "linear", "easeIn", "easeOut", "easeInOut", "bounce", "elastic"

## 设计规范

1. **总时长**: 30-60 秒，6-12 个场景
2. **第一个场景**: 标题页（标题 + 副标题 + 简短描述）
3. **最后一个场景**: 总结要点
4. **配色**: 深色背景（shape 全屏矩形做背景层），浅色/亮色文字
5. **布局**: 所有元素使用绝对坐标定位（基于 1920x1080）
6. **层次**: 背景 shape 放在 layers 数组最前面，文字放在后面
7. **动画**: 合理使用入场动画，配合 delay 实现依次入场效果
8. **可视化**: 用 shape + text 组合实现柱状图、流程图等
   - 柱状图: 不同高度的 rectangle + 底部 text 标签，每个柱子用不同颜色
   - 流程图: rectangle/circle shape + text + line 连接
   - 对比表格: group 包含多行 shape + text
9. **中英文双语** 内容
10. **不同数据项** 必须使用不同颜色，颜色鲜明醒目

直接输出 JSON，不要包裹在代码块中"""
