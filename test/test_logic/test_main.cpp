#include <unity.h>
#include "PlantLogic.h"

using namespace plant8;

void test_mapping_normal_direction() {
  TEST_ASSERT_FLOAT_WITHIN(0.01f, 0.0f, rawToPercent(2500, 2500, 1500));
  TEST_ASSERT_FLOAT_WITHIN(0.01f, 50.0f, rawToPercent(2000, 2500, 1500));
  TEST_ASSERT_FLOAT_WITHIN(0.01f, 100.0f, rawToPercent(1500, 2500, 1500));
}

void test_mapping_reverse_direction() {
  TEST_ASSERT_FLOAT_WITHIN(0.01f, 0.0f, rawToPercent(1500, 1500, 2500));
  TEST_ASSERT_FLOAT_WITHIN(0.01f, 50.0f, rawToPercent(2000, 1500, 2500));
  TEST_ASSERT_FLOAT_WITHIN(0.01f, 100.0f, rawToPercent(2500, 1500, 2500));
}

void test_three_dry_readings_required() {
  RuntimeState rt;
  Thresholds t;
  updateState(rt, 20, t, true);
  TEST_ASSERT_EQUAL_INT((int)PlantState::Warning, (int)rt.state);
  updateState(rt, 20, t, true);
  TEST_ASSERT_EQUAL_INT((int)PlantState::Warning, (int)rt.state);
  const auto third = updateState(rt, 20, t, true);
  TEST_ASSERT_EQUAL_INT((int)PlantState::NeedsWater, (int)rt.state);
  TEST_ASSERT_TRUE(third.becameNeedsWater);
}

void test_hysteresis_recovery() {
  RuntimeState rt;
  Thresholds t;
  updateState(rt, 20, t, true);
  updateState(rt, 20, t, true);
  updateState(rt, 20, t, true);
  TEST_ASSERT_EQUAL_INT((int)PlantState::NeedsWater, (int)rt.state);
  updateState(rt, 40, t, true);
  TEST_ASSERT_EQUAL_INT((int)PlantState::NeedsWater, (int)rt.state);
  const auto recovered = updateState(rt, 40, t, true);
  TEST_ASSERT_TRUE(recovered.recovered);
}

void setUp() {}
void tearDown() {}

int main(int, char**) {
  UNITY_BEGIN();
  RUN_TEST(test_mapping_normal_direction);
  RUN_TEST(test_mapping_reverse_direction);
  RUN_TEST(test_three_dry_readings_required);
  RUN_TEST(test_hysteresis_recovery);
  return UNITY_END();
}
