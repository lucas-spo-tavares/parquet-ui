output "bucket_name" {
  value       = aws_s3_bucket.app.id
  description = "Private S3 bucket used by the static app."
}

output "cloudfront_distribution_id" {
  value       = aws_cloudfront_distribution.app.id
  description = "CloudFront distribution id used for invalidations."
}

output "cloudfront_domain_name" {
  value       = aws_cloudfront_distribution.app.domain_name
  description = "CloudFront generated domain name."
}

output "application_url" {
  value       = "https://${var.domain_name}"
  description = "Final application URL."
}
