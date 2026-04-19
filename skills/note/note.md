删除 Docker 容器不等于删除数据库数据。
数据库数据通常还保留在 Docker volume 中。
若出现 `Can't locate revision identified by ...`，先检查旧数据库卷是否仍存在。
