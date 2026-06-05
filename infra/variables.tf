variable "domain_name" {
  description = "Full domain used by the application."
  type        = string
  default     = "parquet-ui.lucas-tavares.com"
}

variable "root_domain" {
  description = "Existing Route53 hosted zone root domain."
  type        = string
  default     = "lucas-tavares.com"
}

variable "aws_region" {
  description = "AWS region for regional resources. CloudFront ACM certificate is also created in us-east-1."
  type        = string
  default     = "us-east-1"
}
