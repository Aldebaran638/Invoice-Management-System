# Backend Report（购买记录汇总扩展 + 费用大类/小类管理）

## 1. 需求完成情况

本次后端已完成以下目标：

1. 扩展购买记录汇总（`purchase-record-summary`）
   - 扩展 `purchase_record` 表字段：`founder_name`、`major_category_id`、`sub_category_id`、`remarks`
   - 列表支持分页与筛选（`page`、`page_size`、`major_category_id`、`sub_category_id`）
   - 权限规则：管理员可查看/操作所有记录，普通用户仅可操作自己的记录
   - 业务规则：仅当大类名称为“其他项目费用”时允许 `sub_category_id` 非空
   - 保持逻辑删除能力

2. 新建费用大类管理（`expense-category`）
   - 管理员 CRUD
   - 名称唯一校验
   - 删除前关联检查（购买记录、小类）

3. 新建费用小类管理（`expense-subcategory`）
   - 管理员 CRUD
   - 名称唯一校验
   - 必须关联有效大类
   - 删除前关联检查（购买记录）

4. 统一请求/响应协议（以上 3 个工具）
   - 请求：`request_id`、`ts`、`payload`
   - 成功响应：`version/success/code/message/request_id/ts/data`
   - 失败响应：通过 `HTTPException.detail` 返回统一错误结构

5. 数据库迁移与初始数据
   - 新建 `expense_category`、`expense_subcategory` 两表
   - 扩展 `purchase_record` 表字段并回填旧数据
   - 写入初始大类/小类数据
   - 修复序列同步，避免后续插入主键冲突

---

## 2. 新增/变更 API

### 2.1 购买记录汇总
- `GET /api/v1/purchase-records/purchase-record-summary/`
- `GET /api/v1/purchase-records/purchase-record-summary/{record_id}`
- `POST /api/v1/purchase-records/purchase-record-summary/`
- `PUT /api/v1/purchase-records/purchase-record-summary/{record_id}`
- `DELETE /api/v1/purchase-records/purchase-record-summary/{record_id}`

### 2.2 费用大类管理（管理员）
- `GET /api/v1/system-management/expense-category`
- `GET /api/v1/system-management/expense-category/{category_id}`
- `POST /api/v1/system-management/expense-category`
- `PUT /api/v1/system-management/expense-category/{category_id}`
- `DELETE /api/v1/system-management/expense-category/{category_id}`

### 2.3 费用小类管理（管理员）
- `GET /api/v1/system-management/expense-subcategory`
- `GET /api/v1/system-management/expense-subcategory/{subcategory_id}`
- `POST /api/v1/system-management/expense-subcategory`
- `PUT /api/v1/system-management/expense-subcategory/{subcategory_id}`
- `DELETE /api/v1/system-management/expense-subcategory/{subcategory_id}`

---

## 3. 数据库变更

### 3.1 新表
- `expense_category`
  - `id` bigint PK auto increment
  - `name` varchar(255) unique not null
  - `description` text null
- `expense_subcategory`
  - `id` bigint PK auto increment
  - `name` varchar(255) unique not null
  - `major_category_id` bigint FK -> `expense_category.id`
  - `description` text null

### 3.2 扩展表 `purchase_record`
新增字段：
- `founder_name` varchar(255) not null
- `major_category_id` bigint not null FK -> `expense_category.id`
- `sub_category_id` bigint null FK -> `expense_subcategory.id`
- `remarks` text null

### 3.3 初始数据
- 大类：交通费用、膳食/应酬费用、汽车费用、其他项目费用
- 小类：自动导航承载车、智能喷漆机器人、钢筋折弯与结扎机器人、生产线车队调度、研发部开销

### 3.4 迁移文件
- `backend/app/alembic/versions/c2f4a1e9b7d3_add_expense_category_and_extend_purchase_record.py`

---

## 4. 测试与验证

本轮后端新增/重写测试：

1. `backend/tests/purchase_records/purchase_record_summary/index_test.py`
2. `backend/tests/system_management/expense_category/index_test.py`
3. `backend/tests/system_management/expense_subcategory/index_test.py`

执行结果：
- 三组目标测试全部通过：`9 passed`
- 关键问题修复：迁移初始数据后序列未同步导致主键冲突，已通过 `setval` 修复

---

## 5. 关键实现说明

1. 购买记录汇总列表输出中，按分类 ID 反查分类名称，返回 `major_category_name`、`sub_category_name`
2. 统一错误响应包含业务错误码（如 `MAJOR_CATEGORY_NOT_FOUND`、`EXPENSE_CATEGORY_NAME_EXISTS`）
3. 大类/小类删除均做前置关联检查，避免破坏关联数据
4. 已新增购买记录图片上传接口与静态资源挂载，并通过 `UPLOAD_DIR` 控制存储目录

---

## 6. 本次紧急修复（purchase_image_url）

1. 已在 `PurchaseRecord` 模型新增字段：`purchase_image_url: str | None = Field(default=None, max_length=500)`
2. 已在相关 Schema 新增字段：
   - `PurchaseRecordSummaryRecord.purchase_image_url`
   - `PurchaseRecordSummaryCreate.purchase_image_url`
   - `PurchaseRecordSummaryUpdate.purchase_image_url`
3. 已在创建/更新服务逻辑中写入该字段，并在详情/列表响应中返回该字段
4. 已生成并执行迁移：
   - `backend/app/alembic/versions/0d3b5d02e317_add_purchase_image_url.py`
   - 已执行 `alembic upgrade head`
5. 验证结果：
   - 数据库 `purchase_record` 表已存在 `purchase_image_url` 列
   - 路径值 `/uploads/purchase_record/demo-check.jpg` 可成功写入并读回
   - 三组目标测试结果：`9 passed`
