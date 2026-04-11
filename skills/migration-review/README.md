# Migration Review

这份说明只管一件事：修改后端表结构后，如何生成、检查并应用数据库迁移。

## 改哪里

后端表定义目前主要改这里：

- `backend/app/models.py`

迁移文件会生成到这里：

- `backend/app/alembic/versions/`

## 基本流程

1. 修改 `backend/app/models.py`
2. 在本地执行迁移脚本
3. 终端查看新迁移文件内容
4. 人工确认是否正确
5. 确认后执行数据库升级

## 你要检查什么

重点看新迁移文件里的：

- `upgrade()`
- `downgrade()`

检查这些问题：

- 改的是不是你想改的表
- 加/删的是不是你想改的字段
- 有没有多余操作
- 回滚逻辑是否合理

## 原则

- 迁移文件应在本地项目目录生成
- 迁移文件应和代码一起提交到 Git
- 不要只在容器里生成正式迁移文件
- 服务器更适合执行迁移，不适合生成正式迁移文件

## 脚本

可使用：

- `skills/migration-review/review_migration.py`

运行时需要提供一个 `Message` 参数。

这个 `Message` 就是这次迁移的一句简短说明，会传给：

- `alembic revision --autogenerate -m "..."`

它主要用来生成更容易识别的迁移文件名。

例如：

```powershell
uv run --project backend python .\skills\migration-review\review_migration.py "add amount to item"
```

建议：

- 迁移说明尽量使用英文或拼音短语
- 不要写得太长
- 最好直接说明“改了哪张表、加了什么字段”

不太推荐：

- `给item表添加字段test_amount`
- `update`

更推荐：

- `add test_amount to item`
- `create invoice table`

作用：

- 先检查数据库当前 revision 是否和本地迁移链匹配
- 如果数据库没到最新 revision，会先阻止继续生成新迁移
- 自动生成迁移文件
- 找出新文件
- 打印文件内容
- 等待你输入 `Y/N`
- 确认后执行 `alembic upgrade head`
- 如果生成后流程失败，会删除本次新生成的迁移文件，避免留下半成品
- 使用 `loguru` 输出流程日志
