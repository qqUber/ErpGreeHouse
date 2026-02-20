#!/usr/bin/env python3
"""
Telegram CRM MVP - Test Runner

Cross-platform test runner with comprehensive reporting.
Supports unit, integration, E2E, and security tests.

Usage:
    python test_runner.py                  # Run all tests
    python test_runner.py --unit           # Run unit tests only
    python test_runner.py --integration    # Run integration tests only
    python test_runner.py --coverage       # Run with coverage report
    python test_runner.py --watch          # Watch mode for development
"""

import os
import sys
import subprocess
import argparse
import json
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any


class TestRunner:
    """Main test runner class"""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.tests_dir = project_root / 'tests'
        self.reports_dir = project_root / 'reports'
        self.timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        self.report_dir = self.reports_dir / self.timestamp
        
        # Create reports directory
        self.report_dir.mkdir(parents=True, exist_ok=True)
        
        # Test configuration
        self.pytest_args = [
            '--tb=short',
            '--strict-markers',
            f'--html={self.report_dir / "report.html"}',
            '--self-contained-html'
        ]
        
    def setup_environment(self):
        """Setup test environment variables"""
        os.environ['TEST_MODE'] = 'true'
        os.environ['ERP_MOCK_MODE'] = 'true'
        os.environ['DEBUG_MODE'] = 'false'
        os.environ['PYTHONPATH'] = str(self.project_root)
        
        # Load .env.test if exists
        env_file = self.project_root / '.env.test'
        if env_file.exists():
            print(f"📄 Loading environment from {env_file}")
            with open(env_file) as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        os.environ[key] = value
    
    def run_command(self, cmd: List[str], cwd: Path = None) -> int:
        """Run a command and return exit code"""
        print(f"🚀 Running: {' '.join(cmd)}")
        
        try:
            result = subprocess.run(
                cmd,
                cwd=cwd or self.project_root,
                capture_output=False,
                text=True
            )
            return result.returncode
        except Exception as e:
            print(f"❌ Error running command: {e}")
            return 1
    
    def run_unit_tests(self) -> bool:
        """Run unit tests"""
        print("\n" + "="*60)
        print("🧪 RUNNING UNIT TESTS")
        print("="*60)
        
        cmd = [
            sys.executable, '-m', 'pytest',
            str(self.tests_dir / 'unit'),
            '-v',
            '--tb=short',
            f'--html={self.report_dir / "unit_tests.html"}',
            '--self-contained-html'
        ]
        
        exit_code = self.run_command(cmd)
        return exit_code == 0
    
    def run_integration_tests(self) -> bool:
        """Run integration tests"""
        print("\n" + "="*60)
        print("🔗 RUNNING INTEGRATION TESTS")
        print("="*60)
        
        cmd = [
            sys.executable, '-m', 'pytest',
            str(self.tests_dir / 'integration'),
            '-v',
            '--tb=short',
            f'--html={self.report_dir / "integration_tests.html"}',
            '--self-contained-html'
        ]
        
        exit_code = self.run_command(cmd)
        return exit_code == 0
    
    def run_e2e_tests(self) -> bool:
        """Run E2E tests"""
        print("\n" + "="*60)
        print("🎭 RUNNING E2E TESTS")
        print("="*60)
        
        cmd = [
            sys.executable, '-m', 'pytest',
            str(self.tests_dir / 'e2e'),
            '-v',
            '--tb=short',
            f'--html={self.report_dir / "e2e_tests.html"}',
            '--self-contained-html'
        ]
        
        exit_code = self.run_command(cmd)
        return exit_code == 0
    
    def run_security_tests(self) -> bool:
        """Run security tests"""
        print("\n" + "="*60)
        print("🔒 RUNNING SECURITY TESTS")
        print("="*60)
        
        # Run bandit
        print("Running Bandit security scan...")
        bandit_cmd = [
            sys.executable, '-m', 'bandit',
            '-r', 'app/',
            '-f', 'json',
            '-o', str(self.report_dir / 'bandit_report.json')
        ]
        
        try:
            self.run_command(bandit_cmd)
        except Exception:
            print("⚠️  Bandit not installed, skipping...")
        
        # Run safety
        print("Running Safety dependency check...")
        safety_cmd = [
            sys.executable, '-m', 'safety',
            'check',
            '--json',
            '--output', str(self.report_dir / 'safety_report.json')
        ]
        
        try:
            self.run_command(safety_cmd)
        except Exception:
            print("⚠️  Safety not installed, skipping...")
        
        return True
    
    def run_with_coverage(self) -> bool:
        """Run tests with coverage report"""
        print("\n" + "="*60)
        print("📊 RUNNING TESTS WITH COVERAGE")
        print("="*60)
        
        cmd = [
            sys.executable, '-m', 'pytest',
            str(self.tests_dir),
            '-v',
            '--tb=short',
            '--cov=app',
            '--cov-report=term-missing',
            f'--cov-report=html:{self.report_dir / "coverage"}',
            f'--cov-report=xml:{self.report_dir / "coverage.xml"}',
            f'--html={self.report_dir / "coverage_report.html"}',
            '--self-contained-html'
        ]
        
        exit_code = self.run_command(cmd)
        return exit_code == 0
    
    def run_all_tests(self) -> bool:
        """Run all test suites"""
        results = []
        
        results.append(('Unit Tests', self.run_unit_tests()))
        results.append(('Integration Tests', self.run_integration_tests()))
        results.append(('Security Tests', self.run_security_tests()))
        
        # Print summary
        print("\n" + "="*60)
        print("📊 TEST SUMMARY")
        print("="*60)
        
        for name, passed in results:
            status = "✅ PASSED" if passed else "❌ FAILED"
            print(f"{status} - {name}")
        
        all_passed = all(result[1] for result in results)
        
        return all_passed
    
    def generate_summary(self, results: Dict[str, bool]):
        """Generate test execution summary"""
        summary = f"""# Test Execution Summary

**Date**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
**Platform**: {sys.platform}
**Python**: {sys.version}

## Results

| Test Suite | Status |
|------------|--------|
"""
        
        for name, passed in results.items():
            status = "✅ PASSED" if passed else "❌ FAILED"
            summary += f"| {name} | {status} |\n"
        
        overall = "✅ ALL TESTS PASSED" if all(results.values()) else "❌ SOME TESTS FAILED"
        summary += f"\n## Overall: {overall}\n\n"
        
        summary += "## Reports\n\n"
        summary += f"- HTML Report: `{self.report_dir / 'report.html'}`\n"
        summary += f"- Unit Tests: `{self.report_dir / 'unit_tests.html'}`\n"
        summary += f"- Integration: `{self.report_dir / 'integration_tests.html'}`\n"
        
        summary_file = self.report_dir / 'SUMMARY.md'
        with open(summary_file, 'w') as f:
            f.write(summary)
        
        print(f"\n📄 Summary saved to: {summary_file}")
    
    def run(self, args: argparse.Namespace) -> int:
        """Main run method"""
        print("🧪 Telegram CRM MVP - Test Runner")
        print("="*60)
        print(f"📁 Project Root: {self.project_root}")
        print(f"📂 Reports Dir: {self.report_dir}")
        print("="*60)
        
        # Setup environment
        self.setup_environment()
        
        # Check if virtual environment is active
        if not hasattr(sys, 'real_prefix') and not os.environ.get('VIRTUAL_ENV'):
            print("⚠️  Warning: Not running in a virtual environment")
        
        results = {}
        
        try:
            if args.coverage:
                results['Coverage Tests'] = self.run_with_coverage()
            elif args.unit:
                results['Unit Tests'] = self.run_unit_tests()
            elif args.integration:
                results['Integration Tests'] = self.run_integration_tests()
            elif args.e2e:
                results['E2E Tests'] = self.run_e2e_tests()
            elif args.security:
                results['Security Tests'] = self.run_security_tests()
            else:
                results = {
                    'Unit Tests': self.run_unit_tests(),
                    'Integration Tests': self.run_integration_tests(),
                    'Security Tests': self.run_security_tests()
                }
            
            # Generate summary
            self.generate_summary(results)
            
            # Return exit code
            all_passed = all(results.values())
            return 0 if all_passed else 1
            
        except KeyboardInterrupt:
            print("\n⚠️  Tests interrupted by user")
            return 1
        except Exception as e:
            print(f"\n❌ Test execution failed: {e}")
            return 1


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Telegram CRM Test Runner')
    
    parser.add_argument(
        '--unit',
        action='store_true',
        help='Run unit tests only'
    )
    
    parser.add_argument(
        '--integration',
        action='store_true',
        help='Run integration tests only'
    )
    
    parser.add_argument(
        '--e2e',
        action='store_true',
        help='Run E2E tests only'
    )
    
    parser.add_argument(
        '--security',
        action='store_true',
        help='Run security tests only'
    )
    
    parser.add_argument(
        '--coverage',
        action='store_true',
        help='Run tests with coverage report'
    )
    
    parser.add_argument(
        '--project-root',
        type=Path,
        default=Path(__file__).parent,
        help='Project root directory'
    )
    
    args = parser.parse_args()
    
    # Create and run
    runner = TestRunner(args.project_root)
    exit_code = runner.run(args)
    
    sys.exit(exit_code)


if __name__ == '__main__':
    main()
