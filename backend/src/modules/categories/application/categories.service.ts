import { Injectable, Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  CATEGORY_REPOSITORY,
  CategoryRepository,
} from '../domain/category.repository';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryResponseDto,
} from './dtos/category.dto';
import { Category } from '../domain/category.entity';
import { NotFoundError } from '../../../shared/domain/errors';

@Injectable()
export class CategoriesService {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: CategoryRepository,
  ) {}

  async findAll(): Promise<CategoryResponseDto[]> {
    const categories = await this.categoryRepository.findAll();
    return categories
      .sort((a, b) => a.order - b.order)
      .map(this.toResponseDto);
  }

  async findById(id: string): Promise<CategoryResponseDto> {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundError('Category', id);
    }
    return this.toResponseDto(category);
  }

  async create(dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    const slug = this.generateSlug(dto.name);
    const category = await this.categoryRepository.create({
      name: dto.name,
      slug,
      targetPercentage: dto.targetPercentage,
      order: dto.order ?? 99,
      isActive: true,
      description: dto.description,
    });
    return this.toResponseDto(category);
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryResponseDto> {
    const existing = await this.categoryRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Category', id);
    }

    const updates: Partial<Category> = {};
    if (dto.name !== undefined) {
      updates.name = dto.name;
      updates.slug = this.generateSlug(dto.name);
    }
    if (dto.targetPercentage !== undefined) updates.targetPercentage = dto.targetPercentage;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.order !== undefined) updates.order = dto.order;
    if (dto.isActive !== undefined) updates.isActive = dto.isActive;

    const updated = await this.categoryRepository.update(id, updates);
    return this.toResponseDto(updated);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.categoryRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Category', id);
    }
    await this.categoryRepository.delete(id);
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  private toResponseDto(category: Category): CategoryResponseDto {
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      targetPercentage: category.targetPercentage,
      order: category.order,
      isActive: category.isActive,
      description: category.description,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }
}
