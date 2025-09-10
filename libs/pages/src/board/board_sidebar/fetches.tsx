
class API  {
  baseURL: string;
  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  async fetchCategories() {
    try {
      const response = await fetch(`${this.baseURL}/blocks/categories`);
      if (!response.ok) throw new Error('Failed to fetch categories');
      return await response.json();
    } catch (err) {
      console.error('Error fetching categories:', err);
      throw err;
    }
  }

  async fetchGroupBlocks(group: string) {
    try {
      const response = await fetch(`${this.baseURL}/blocks/${group}`);
      if (!response.ok) throw new Error(`Failed to fetch ${group} blocks`);
      return await response.json();
    } catch (err) {
      console.error(`Error fetching ${group} blocks:`, err);
      throw err;
    }
  }

  async fetchBlockDetail(group: string, category: string, blockId: string) {
    try {
      const response = await fetch(`${this.baseURL}/blocks/${group}/${category}/${blockId}`);
      if (!response.ok) throw new Error('Failed to fetch block details');
      return await response.json();
    } catch (err) {
      console.error('Error fetching block details:', err);
      throw err;
    }
  }
}
