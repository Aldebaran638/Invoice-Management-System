# Frontend Report（购买记录汇总扩展 + 费用大类/小类管理）

## 1. 完成情况

本次前端已完成并落地以下能力：

1. 导航更新（系统管理）
   - 新增「费用大类管理」入口（管理员可见）
   - 新增「费用小类管理」入口（管理员可见）

2. 购买记录汇总扩展（purchase-record-summary）
   - 列表新增字段展示：创始人、大类、小类、备注
   - 支持按大类、小类筛选
   - 新增/编辑表单扩展字段：`founder_name`、`major_category_id`、`sub_category_id`、`remarks`
   - 条件规则：仅当大类为「其他项目费用」时显示并允许选择小类
   - 详情弹窗展示完整字段
   - 管理员/普通用户视角提示文案区分

3. 新建费用大类管理工具（expense-category）
   - 页面、API、schema、types、hooks、列定义完整实现
   - 列表 / 详情 / 新增 / 编辑 / 删除闭环

4. 新建费用小类管理工具（expense-subcategory）
   - 页面、API、schema、types、hooks、列定义完整实现
   - 列表 / 详情 / 新增 / 编辑 / 删除闭环
   - 支持按大类筛选

5. 路由与权限
   - 新增页面路由：`/_layout/expense-category`、`/_layout/expense-subcategory`
   - 路由 `beforeLoad` 增加管理员权限校验（非管理员重定向首页）
   - `routeTree.gen.ts` 已包含新路由

---

## 2. 测试与自检

### 2.1 已更新/新增测试文件

1. `frontend/tests/purchase-records/purchase-record-summary/index.spec.ts`
2. `frontend/tests/system-management/expense-category/index.spec.ts`
3. `frontend/tests/system-management/expense-subcategory/index.spec.ts`

### 2.2 执行结果

- 购买记录汇总测试：通过（3 passed）
- 系统管理新增两组测试：通过（2 passed）

> 说明：当前环境中 `playwright.config.ts` 的 `webServer.command` 依赖 `bun`，为避免环境缺失导致阻塞，执行时采用了「显式启动 Vite + `--no-deps`」方式验证目标测试。

---

## 3. 关键文件清单（本次前端）

### 3.1 导航与路由
- `frontend/src/config/tool-navigation.tsx`
- `frontend/src/routes/_layout/expense-category.tsx`
- `frontend/src/routes/_layout/expense-subcategory.tsx`
- `frontend/src/routeTree.gen.ts`

### 3.2 购买记录汇总扩展
- `frontend/src/tools/purchase-records/purchase-record-summary/types.ts`
- `frontend/src/tools/purchase-records/purchase-record-summary/schemas.ts`
- `frontend/src/tools/purchase-records/purchase-record-summary/api.ts`
- `frontend/src/tools/purchase-records/purchase-record-summary/hooks/use-purchase-record-summary.ts`
- `frontend/src/tools/purchase-records/purchase-record-summary/components/columns.tsx`
- `frontend/src/tools/purchase-records/purchase-record-summary/components/purchase-record-summary-page-v2.tsx`
- `frontend/src/tools/purchase-records/purchase-record-summary/components/purchase-record-summary-page.tsx`

### 3.3 费用大类管理
- `frontend/src/tools/system-management/expense-category/index.tsx`
- `frontend/src/tools/system-management/expense-category/types.ts`
- `frontend/src/tools/system-management/expense-category/schemas.ts`
- `frontend/src/tools/system-management/expense-category/api.ts`
- `frontend/src/tools/system-management/expense-category/hooks/use-expense-category.ts`
- `frontend/src/tools/system-management/expense-category/components/columns.tsx`
- `frontend/src/tools/system-management/expense-category/components/expense-category-page.tsx`

### 3.4 费用小类管理
- `frontend/src/tools/system-management/expense-subcategory/index.tsx`
- `frontend/src/tools/system-management/expense-subcategory/types.ts`
- `frontend/src/tools/system-management/expense-subcategory/schemas.ts`
- `frontend/src/tools/system-management/expense-subcategory/api.ts`
- `frontend/src/tools/system-management/expense-subcategory/hooks/use-expense-subcategory.ts`
- `frontend/src/tools/system-management/expense-subcategory/components/columns.tsx`
- `frontend/src/tools/system-management/expense-subcategory/components/expense-subcategory-page.tsx`

---

## 4. 已知问题与限制

1. 当前 Playwright 配置使用 `bun run dev`，若环境未安装 bun，会导致默认测试启动失败。
2. 本次目标测试已通过；若要恢复“开箱即跑”，建议后续将 `playwright.config.ts` 的 `webServer.command` 改为与项目环境一致的命令（例如 `npm run dev`）。
