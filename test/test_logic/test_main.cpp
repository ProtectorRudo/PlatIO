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

void test_wet_risk_requires_sustained_readings() {
  WetRiskRuntime rt;
  WetRiskPolicy p;
  p.saturatedPercent = 90.0f;
  p.clearPercent = 80.0f;
  p.saturatedConfirmations = 3;
  p.clearConfirmations = 2;

  TEST_ASSERT_FALSE(updateWetRisk(rt, 95.0f, p, true).tooWet);
  TEST_ASSERT_FALSE(updateWetRisk(rt, 96.0f, p, true).tooWet);
  const auto third = updateWetRisk(rt, 97.0f, p, true);
  TEST_ASSERT_TRUE(third.tooWet);
  TEST_ASSERT_TRUE(third.becameTooWet);
}

void test_wet_risk_resets_if_saturation_breaks_early() {
  WetRiskRuntime rt;
  WetRiskPolicy p;
  p.saturatedPercent = 90.0f;
  p.saturatedConfirmations = 3;

  updateWetRisk(rt, 95.0f, p, true);
  updateWetRisk(rt, 95.0f, p, true);
  updateWetRisk(rt, 70.0f, p, true);
  const auto afterReset = updateWetRisk(rt, 95.0f, p, true);

  TEST_ASSERT_FALSE(afterReset.tooWet);
  TEST_ASSERT_EQUAL_UINT16(1, rt.saturatedCount);
}

void test_wet_risk_uses_clear_hysteresis() {
  WetRiskRuntime rt;
  WetRiskPolicy p;
  p.saturatedPercent = 90.0f;
  p.clearPercent = 80.0f;
  p.saturatedConfirmations = 2;
  p.clearConfirmations = 2;

  updateWetRisk(rt, 95.0f, p, true);
  updateWetRisk(rt, 95.0f, p, true);
  TEST_ASSERT_TRUE(rt.tooWet);

  updateWetRisk(rt, 85.0f, p, true);
  TEST_ASSERT_TRUE(rt.tooWet);
  updateWetRisk(rt, 75.0f, p, true);
  TEST_ASSERT_TRUE(rt.tooWet);
  const auto cleared = updateWetRisk(rt, 75.0f, p, true);
  TEST_ASSERT_FALSE(cleared.tooWet);
  TEST_ASSERT_TRUE(cleared.cleared);
}

void test_moist_profile_disables_overwet_warning() {
  const WetRiskPolicy p = wetRiskPolicyForProfile(WaterProfile::Moist);
  WetRiskRuntime rt;
  for (int i = 0; i < 1000; ++i) updateWetRisk(rt, 100.0f, p, true);
  TEST_ASSERT_FALSE(rt.tooWet);
  TEST_ASSERT_FALSE(p.enabled);
}

void test_wet_risk_profiles_become_more_tolerant() {
  const WetRiskPolicy arid = wetRiskPolicyForProfile(WaterProfile::Arid);
  const WetRiskPolicy dryDown = wetRiskPolicyForProfile(WaterProfile::DryDown);
  const WetRiskPolicy balanced = wetRiskPolicyForProfile(WaterProfile::Balanced);
  const WetRiskPolicy evenMoist = wetRiskPolicyForProfile(WaterProfile::EvenMoist);

  TEST_ASSERT_TRUE(arid.saturatedPercent <= dryDown.saturatedPercent);
  TEST_ASSERT_TRUE(dryDown.saturatedPercent <= balanced.saturatedPercent);
  TEST_ASSERT_TRUE(balanced.saturatedPercent <= evenMoist.saturatedPercent);
  TEST_ASSERT_TRUE(arid.saturatedConfirmations < dryDown.saturatedConfirmations);
  TEST_ASSERT_TRUE(dryDown.saturatedConfirmations < balanced.saturatedConfirmations);
  TEST_ASSERT_TRUE(balanced.saturatedConfirmations < evenMoist.saturatedConfirmations);
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
  RUN_TEST(test_wet_risk_requires_sustained_readings);
  RUN_TEST(test_wet_risk_resets_if_saturation_breaks_early);
  RUN_TEST(test_wet_risk_uses_clear_hysteresis);
  RUN_TEST(test_moist_profile_disables_overwet_warning);
  RUN_TEST(test_wet_risk_profiles_become_more_tolerant);
  return UNITY_END();
}
