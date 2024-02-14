variable "LAMBDA_MOUNT_CWD" {
  type = string
}

variable "code_path" {
  type = string
}

variable "function_name" {
  type = string
}

variable "handler" {
  type    = string
  default = "index.handler"
}

variable "runtime" {
  type    = string
  default = "nodejs16.x"
}

variable "handler_zip" {
  type    = bool
  default = false
}

locals {
  path = "${var.LAMBDA_MOUNT_CWD}/${var.code_path}"
}

resource "aws_lambda_function" "exampleFunction" {
  s3_bucket     = "hot-reload"
  s3_key        = local.path
  function_name = var.function_name
  role          = aws_iam_role.lambda-execution-role.arn
  handler       = var.handler
  runtime       = var.runtime
  memory_size   = 128
  timeout       = 30
  environment {
    variables = {
      FUNCTION_NAME = var.function_name
    }
  }

}

resource "aws_cloudwatch_log_group" "lambda_log_group_one" {
  name = "/aws/lambda/${aws_lambda_function.exampleFunction.function_name}"
}

resource "aws_lambda_function_url" "exampleFunctionUrl" {
  function_name      = aws_lambda_function.exampleFunction.function_name
  authorization_type = "NONE"
}

output "function_url" {
  value = aws_lambda_function_url.exampleFunctionUrl.function_url
}

output "function_arn" {
  value = aws_lambda_function.exampleFunction.arn
}

output "code_path" {
  value = local.path
}
