module "lambda-hot-heloading" {
  source           = "./modules/lambda"
  function_name    = "lambdaNodejs"
  code_path        = "code/dist"
  LAMBDA_MOUNT_CWD = var.LAMBDA_MOUNT_CWD
}

locals {
  modules = {
    lambda-node: module.lambda-hot-heloading
  }
}

output "resources_output" {
  value = [for i in local.modules: i ]
}