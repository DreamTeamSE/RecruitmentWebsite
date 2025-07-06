### Create DB Command

```
aws rds create-db-instance \
  --db-instance-identifier recruitment-backend-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username postgres \
  --master-user-password RecruitmentDB2025! \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-04b5d97cc82ca4cfa \
  --db-subnet-group-name recruitment-db-subnet-group \
  --publicly-accessible
```