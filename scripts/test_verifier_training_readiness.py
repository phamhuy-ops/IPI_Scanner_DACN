import importlib.util
import pathlib
import unittest

path = pathlib.Path(__file__).with_name("inspect-verifier-training.py")
spec = importlib.util.spec_from_file_location("verifier_training_inventory", path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class TrainingInventoryTests(unittest.TestCase):
    def test_installed_libraries_do_not_prove_training_readiness(self):
        inventory = {"packages": {name: "test" for name in module.PACKAGES}, "disk": {"free_bytes": 30 * 1024 ** 3}}
        result = module.assess_inventory(inventory)
        self.assertEqual(result["missing_packages_in_active_python"], [])
        self.assertTrue(result["disk_budget_met"])
        self.assertIsNone(result["cuda_training_compatible"])
        self.assertFalse(result["training_ready"])

    def test_missing_values_are_unknown_not_zero(self):
        result = module.assess_inventory({"packages": {}, "disk": {}})
        self.assertIsNone(result["disk_budget_met"])
        self.assertEqual(len(result["missing_packages_in_active_python"]), len(module.PACKAGES))

    def test_low_disk_fails_project_budget_without_running_training(self):
        result = module.assess_inventory({"packages": {}, "disk": {"free_bytes": 7 * 1024 ** 3}})
        self.assertFalse(result["disk_budget_met"])
        self.assertIsNone(result["forward_backward_smoke_passed"])


if __name__ == "__main__":
    unittest.main()
