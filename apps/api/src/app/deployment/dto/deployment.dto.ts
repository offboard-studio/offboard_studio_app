import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, Min, Max, IsNotEmpty, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SshConfigDto {
  @ApiProperty({ description: 'SSH host address', example: '192.168.1.100' })
  @IsString()
  @IsNotEmpty({ message: 'Host is required' })
  host!: string;

  @ApiProperty({ description: 'SSH port', example: 22, default: 22 })
  @IsNumber()
  @Min(1, { message: 'Port must be at least 1' })
  @Max(65535, { message: 'Port must be at most 65535' })
  port!: number;

  @ApiProperty({ description: 'SSH username', example: 'ubuntu' })
  @IsString()
  @IsNotEmpty({ message: 'Username is required' })
  username!: string;

  @ApiPropertyOptional({ description: 'SSH password (if not using private key)' })
  @IsString()
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({ description: 'Path to SSH private key file' })
  @IsString()
  @IsOptional()
  privateKeyPath?: string;
}

export class FileDto {
  @ApiProperty({ description: 'Remote file path' })
  @IsString()
  @IsNotEmpty()
  path!: string;

  @ApiProperty({ description: 'File content to write' })
  @IsString()
  content!: string;
}

export class DeployConfigDto {
  @ApiProperty({ description: 'SSH connection configuration', type: SshConfigDto })
  @ValidateNested()
  @Type(() => SshConfigDto)
  ssh!: SshConfigDto;

  @ApiProperty({ description: 'Commands to execute on remote server', type: [String], example: ['ls -la', 'pwd'] })
  @IsArray()
  @IsString({ each: true })
  @MinLength(1, { each: true, message: 'Commands cannot be empty strings' })
  commands!: string[];

  @ApiPropertyOptional({ description: 'Files to create on remote server', type: [FileDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => FileDto)
  files?: FileDto[];
}
