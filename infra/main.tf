locals {
  bucket_name = replace(var.domain_name, ".", "-")
  common_tags = {
    Project = "parquet-ui"
    Managed = "terraform"
  }
}
