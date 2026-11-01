package org.frc2910.robot.config;

import edu.wpi.first.units.AngularVelocityUnit;
import edu.wpi.first.units.Units;
import edu.wpi.first.units.VoltageUnit;
import edu.wpi.first.units.measure.Per;
import edu.wpi.first.units.measure.Time;
import edu.wpi.first.units.measure.Velocity;
import edu.wpi.first.units.measure.Voltage;

/**
 * Collection of project-wide constants used to configure robot behavior, limits and names.
 *
 * <p>Values in this class are treated as configuration and tuning constants and are referenced
 * throughout the codebase. Some nested classes group related constants (e.g. shooter,
 * intake, drive).
 * </p>
 */
public class Constants {

    @SuppressWarnings("unused")
    public enum Mode {
        /**
         * Running on a real robot.
         */
        REAL,

        /**
         * Running a physics simulator.
         */
        SIM,

        /**
         * Replaying from a log file.
         */
        REPLAY
    }

    /** Path where HOOT logs are written on the roboRIO or in simulation. */
    public static final String HOOT_LOGS_PATH = "/U/logs/hoot/";

    public static final class ShooterConstants {
        public static final double FLYWHEEL_RPM_TOLERANCE = 3000.0;
        public static final double HOOD_MIN_ANGLE = 0.0;
        public static final double HOOD_MAX_ANGLE = 37.0;
        public static final double HOOD_GEAR_RATIO = (52.0 / 12.0) * (18.0 / 12.0) * (146.0 / 10.0);
        public static final double HOOD_GEAR_RATIO_WITH_UNIT_CONVERSIONS = HOOD_GEAR_RATIO / 360.0;
        public static final double HOOD_KV =
                12.0 / ((KRAKEN_X44_FREE_SPEED / 60.0) / HOOD_GEAR_RATIO_WITH_UNIT_CONVERSIONS);
        public static final double HOOD_DEGREE_TOLERANCE = 3.0;
        public static final double HOOD_KP = 5.0 * HOOD_GEAR_RATIO_WITH_UNIT_CONVERSIONS;
        public static final double HOOD_MOTION_MAGIC_ACCELERATION = 3000.0;
        public static final double HOOD_MOTION_MAGIC_VELOCITY = 7000.0 / 60.0 / HOOD_GEAR_RATIO * 360.0;
        public static final double FLYWHEEL_KP = 0.35;
        public static final double FLYWHEEL_KV = (12.0 / (KRAKEN_X60_FREE_SPEED / 60.0));
        public static final double FLYWHEEL_STATOR_CURRENT_LIMIT = 60.0;
        public static final double FLYWHEEL_SUPPLY_CURRENT_LIMIT = 35.0;
        public static final double FLYWHEEL_GEAR_RATIO = 1.0;

        public static final double PASSING_ANGLE = ShooterConstants.HOOD_MAX_ANGLE;
    }

    public static final class IntakeConstants {
        public static final double INTAKE_SERVO_GEAR_RATIO =
                (36.0 / 12.0) * (26.0 / 26.0) * (64.0 / 16.0) * (30.0 / 9.0);
        public static final double INTAKE_GEAR_RATIO_WITH_UNIT_CONVERSIONS = INTAKE_SERVO_GEAR_RATIO / 360.0;
        public static final double INTAKE_MAX_ANGLE = 114.3;
        public static final double INTAKE_MIN_ANGLE = 0.0;
        public static final double INTAKE_SERVO_KP = 5.0 * INTAKE_GEAR_RATIO_WITH_UNIT_CONVERSIONS;
        public static final double INTAKE_SERVO_KV =
                12.0 / ((KRAKEN_X60_FREE_SPEED / 60.0) / INTAKE_GEAR_RATIO_WITH_UNIT_CONVERSIONS);
        public static final double INTAKE_MOTION_MAGIC_VELOCITY =
                5500.0 / 60.0 / INTAKE_SERVO_GEAR_RATIO * 360.0; // In mechanism units
        public static final double INTAKE_MOTION_MAGIC_ACCELERATION = 4000.0;
    }

    public static final class HopperConstants {
        public static final double HOPPER_GEAR_RATIO = 1.0; // Not accurate
        public static final double HOPPER_KP = 0.0;
    }

    public static final boolean useMapleSim = false;
    public static final boolean tuningMode = false;
    public static boolean disableHAL = false;

    public static final double KRAKEN_X44_FREE_SPEED = 7368.0;
    public static final double KRAKEN_X60_FREE_SPEED = 5800.0;
    public static final String CANIVORE_BUS_NAME = "CANivore";

    public static final String operatorDashboardName = "Operator Dashboard";
    public static final String debugDashboardName = "Debug Dashboard";
    public static final String autoChooserName = "SmartDashboard/ Auto/ Programs";
    public static final double TOLERANCE_FOR_ENDING_PATH_METERS = 0.2;

    public static final class DriveConstants {
        public static final double kRobotWeightPounds = 150.0;
        public static final double kBumperLengthInches = 35.625;
        public static final double kBumperWidthInches = 35.625;
        public static final int kDriveMotorCount = 1;

        public static final double resetModulesToleranceInDegrees = 2.125;
    }

    public static class BaseSubsystems {
        public static final double BASE_MOTOR_DEFAULT_ROTOR_TO_SENSOR_RATIO = 1.0;
    }

    /* See https://github.com/CrossTheRoadElec/Phoenix6-Examples/blob/main/java/SwerveWithPathPlanner/src/main/java/frc/robot/subsystems/CommandSwerveDrivetrain.java */
    public static class SystemCharacterizationConstants {
        public static boolean ENABLE_SYSID_PROGRAMS = false;

        public static final Velocity<VoltageUnit> DEFAULT_TRANSLATION_RAMP_RATE =
                Units.Volts.of(1).per(Units.Second);
        public static final Velocity<VoltageUnit> DEFAULT_STEER_RAMP_RATE =
                Units.Volts.of(1).per(Units.Second);
        public static final Velocity<VoltageUnit> DEFAULT_ROTATION_RAMP_RATE =
                Units.Volts.of(Math.PI / 6).per(Units.Second);
        public static final Voltage DEFAULT_TRANSLATION_STEP_VOLTAGE = Units.Volts.of(4);
        public static final Voltage DEFAULT_STEER_STEP_VOLTAGE = Units.Volts.of(7);
        public static final Voltage DEFAULT_ROTATION_STEP_VOLTAGE = Units.Volts.of(Math.PI);
        public static final Time DEFAULT_TIMEOUT = Units.Seconds.of(5);

        public static final Per<AngularVelocityUnit, VoltageUnit> VOLTAGE_TO_ROTATION_CONVERSION_FACTOR =
                Units.RotationsPerSecond.of(0.25).per(Units.Volt);
    }
}
