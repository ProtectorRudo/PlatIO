#include <unity.h>
#include "PlantLogic.h"
#include "PlantProfiles.h"
#include "AutoLearn.h"

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

void test_water_profiles_have_expected_order() {
  const Thresholds arid = thresholdsForProfile(WaterProfile::Arid);
  const Thresholds dryDown = thresholdsForProfile(WaterProfile::DryDown);
  const Thresholds balanced = thresholdsForProfile(WaterProfile::Balanced);
  const Thresholds evenMoist = thresholdsForProfile(WaterProfile::EvenMoist);
  const Thresholds moist = thresholdsForProfile(WaterProfile::Moist);

  TEST_ASSERT_TRUE(arid.dryPercent < dryDown.dryPercent);
  TEST_ASSERT_TRUE(dryDown.dryPercent < balanced.dryPercent);
  TEST_ASSERT_TRUE(balanced.dryPercent < evenMoist.dryPercent);
  TEST_ASSERT_TRUE(evenMoist.dryPercent < moist.dryPercent);
  TEST_ASSERT_TRUE(arid.dryConfirmations >= balanced.dryConfirmations);
}

void test_water_profile_parser() {
  WaterProfile profile = WaterProfile::Balanced;
  TEST_ASSERT_TRUE(parseWaterProfile("ARID", profile));
  TEST_ASSERT_EQUAL_INT((int)WaterProfile::Arid, (int)profile);
  TEST_ASSERT_TRUE(parseWaterProfile("EVEN_MOIST", profile));
  TEST_ASSERT_EQUAL_INT((int)WaterProfile::EvenMoist, (int)profile);
  TEST_ASSERT_FALSE(parseWaterProfile("UNKNOWN", profile));
}

void test_auto_learn_requires_stable_baseline_and_confirmed_jump() {
  AutoLearnState s;
  observeForAutoCalibration(s, 2500);
  observeForAutoCalibration(s, 2490);
  observeForAutoCalibration(s, 2485);
  const auto jump = observeForAutoCalibration(s, 2100);
  TEST_ASSERT_FALSE(jump.learned);
  const auto confirmed = observeForAutoCalibration(s, 2090);
  TEST_ASSERT_TRUE(confirmed.learned);
  TEST_ASSERT_EQUAL_UINT16(2485, confirmed.dryRaw);
  TEST_ASSERT_EQUAL_UINT16(2100, confirmed.wetRaw);
}

void test_auto_learn_rejects_unstable_jump() {
  AutoLearnState s;
  observeForAutoCalibration(s, 2500);
  observeForAutoCalibration(s, 2495);
  observeForAutoCalibration(s, 2490);
  observeForAutoCalibration(s, 2100);
  const auto rejected = observeForAutoCalibration(s, 2400);
  TEST_ASSERT_FALSE(rejected.learned);
}

void setUp() {}
void tearDown() {}

int main(int, char**) {
  UNITY_BEGIN();
  RUN_TEST(test_mapping_normal_direction);
  RUN_TEST(test_mapping_reverse_direction);
  RUN_TEST(test_three_dry_readings_required);
  RUN_TEST(test_hysteresis_recovery);
  RUN_TEST(test_water_profiles_have_expected_order);
  RUN_TEST(test_water_profile_parser);
  RUN_TEST(test_auto_learn_requires_stable_baseline_and_confirmed_jump);
  RUN_TEST(test_auto_learn_rejects_unstable_jump);
  return UNITY_END();
}
