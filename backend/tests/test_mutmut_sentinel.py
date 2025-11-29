import os


def test_mutmut_forced_fail_guard():
    # Mutmut sets MUTANT_UNDER_TEST=fail when validating that the test
    # suite can detect a failing mutant. Trip the suite in that case so
    # mutmut proceeds; no effect during normal runs.
    assert os.getenv("MUTANT_UNDER_TEST") != "fail"
